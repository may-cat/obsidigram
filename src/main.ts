import { Notice, Plugin, TFile } from "obsidian";
import { requestUrl } from "obsidian";
import {
	DEFAULT_SETTINGS,
	ObsidigramPluginSettings,
	ObsidigramSettingTab,
} from "./settings";

// Типы для Telegram API
interface TelegramResponse {
	ok: boolean;
	result?: TelegramUpdate[];
	error_code?: number;
	description?: string;
}

interface TelegramUpdate {
	update_id: number;
	message?: {
		text?: string;
		caption?: string;
	};
}

// Тип для OpenAI API
interface OpenAIResponse {
	choices?: {
		message?: {
			content?: string;
		};
	}[];
	error?: {
		message?: string;
	};
	message?: string;
}

export default class ObsidigramPlugin extends Plugin {
	settings: ObsidigramPluginSettings;
	private pollingActive: boolean = false;
	private lastUpdateId: number = 0;
	private abortController: AbortController | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ObsidigramSettingTab(this.app, this));
		this.startBot();
	}

	onunload() {
		this.stopBot();
	}

	startBot() {
		if (!this.settings.botToken) {
			new Notice("Obsidigram: telegram's bot token is not set");
			return;
		}

		// Если уже работает — не запускаем повторно
		if (this.pollingActive) {
			console.warn("Obsidigram: bot already running, skipping start");
			return;
		}

		this.pollingActive = true;
		this.pollUpdates().catch((err) => console.error("Polling error:", err));
		new Notice("Obsidigram: telegram bot is online");
	}

	stopBot() {
		// console.log("Stopping bot...");
		this.pollingActive = false;

		// Отменяем текущий запрос
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
	}

	async restartBot() {
		this.stopBot();

		// Даём время на завершение текущего запроса
		await this.sleep(1000);

		this.lastUpdateId = 0;
		this.startBot();
	}

	private async pollUpdates() {
		while (this.pollingActive) {
			// Создаём новый AbortController для каждого запроса
			this.abortController = new AbortController();

			try {
				const url = `https://api.telegram.org/bot${this.settings.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=30`;

				const response = await fetch(url, {
					signal: this.abortController.signal,
				});

				// Проверяем, не остановили ли бота пока ждали ответ
				if (!this.pollingActive) {
					// console.log("Polling stopped, exiting loop");
					break;
				}

				const data: TelegramResponse = await response.json();

				if (!data.ok) {
					// Проверяем на конфликт
					if (data.error_code === 409) {
						console.warn(
							"Conflict detected, waiting before retry...",
						);
						new Notice(
							"Obsidigram: connection conflict detected, reconnecting...",
						);
						await this.sleep(5000);
						continue;
					}

					new Notice(
						`Obsidigram: telegram bot got error: ${data.description}`,
					);
					await this.sleep(10000);
					continue;
				}

				for (const update of data.result ?? []) {
					this.lastUpdateId = update.update_id;

					// Проверяем флаг перед обработкой каждого сообщения
					if (!this.pollingActive) break;

					await this.handleUpdate(update);
				}
			} catch (error) {
				// Игнорируем ошибку отмены запроса
				if (error instanceof Error && error.name === "AbortError") {
					console.warn("Fetch aborted");
					break;
				}

				console.error("Telegram polling error:", error);

				if (this.pollingActive) {
					await this.sleep(5000);
				}
			}
		}

		// console.log("Polling loop ended");
	}

	private async handleUpdate(update: TelegramUpdate) {
		let text: string | null = null;

		if (update.message?.text) {
			text = update.message.text;
		} else if (update.message?.caption) {
			text = update.message.caption;
		}

		if (text) {
			await this.processMessage(text);
		}
	}

	private async processMessage(text: string) {
		const lines = text.split("\n");
		const firstLine = (lines[0] ?? "").trim();

		let fileName: string;
		let messageContent: string;

		if (firstLine.length < 100) {
			fileName = this.sanitizeFileName(firstLine);
			messageContent = lines.slice(1).join("\n").trim();
			if (!messageContent) {
				messageContent = firstLine;
			}
		} else {
			fileName = this.generateDateFileName();
			messageContent = text;
		}

		if (!fileName.endsWith(".md")) {
			fileName += ".md";
		}

		const folderPath = this.settings.saveFolder.trim();
		const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

		try {
			if (folderPath) {
				await this.ensureFolderExists(folderPath);
			}

			let originalContent = "";
			const existingFile = this.app.vault.getAbstractFileByPath(fullPath);

			if (existingFile instanceof TFile) {
				originalContent = await this.app.vault.read(existingFile);
			}

			new Notice(`Obsidigram: AI running...`);

			const aiResult = await this.callOpenAI(
				originalContent,
				messageContent,
			);

			if (!aiResult.success) {
				new Notice(`Obsidigram: AI error! ${aiResult.error}`);
				return;
			}

			if (aiResult.content.length < this.settings.minResponseLength) {
				new Notice(
					`Obsidigram: AI's response is too short (${aiResult.content.length} symbols). I suppose it's some error, file not changed.`,
				);
				return;
			}

			if (existingFile instanceof TFile) {
				await this.app.vault.modify(existingFile, aiResult.content);
				new Notice(`Obsidigram: file updated - ${fileName}`);
			} else {
				await this.app.vault.create(fullPath, aiResult.content);
				new Notice(`Obsidigram: file created - ${fileName}`);
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			console.error("Obsidigram error:", error);
			new Notice(`Obsidigram error: ${message}`);
		}
	}

	private async callOpenAI(
		originalContent: string,
		message: string,
	): Promise<{ success: boolean; content: string; error?: string }> {
		if (!this.settings.openaiApiKey) {
			return {
				success: false,
				content: "",
				error: "API key OpenAI is not set",
			};
		}

		const prompt = this.settings.promptTemplate
			.replace("{original_content}", originalContent)
			.replace("{message}", message);

		const url = `${this.settings.openaiHost}/v1/chat/completions`;

		const requestBody = {
			model: this.settings.openaiModel,
			messages: [
				{ role: "system", content: this.settings.systemPrompt },
				{ role: "user", content: prompt },
			],
			temperature: this.settings.openaiTemperature,
			max_tokens: this.settings.openaiMaxTokens,
		};

		try {
			const response = await requestUrl({
				url: url,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.settings.openaiApiKey}`,
				},
				body: JSON.stringify(requestBody),
			});

			// const responseText = await response.text();
			const responseText = response.text;

			let data: OpenAIResponse;
			try {
				data = JSON.parse(responseText) as OpenAIResponse;
			} catch (parseError) {
				return {
					success: false,
					content: "",
					error: `Can not parse response: ${responseText.substring(0, 200)}`,
				};
			}

			if (response.status < 200 || response.status >= 300) {
				const errorMessage =
					data.error?.message ||
					data.message ||
					`HTTP ${response.status}`;
				return { success: false, content: "", error: errorMessage };
			}

			if (!data.choices || !data.choices[0]?.message?.content) {
				return {
					success: false,
					content: "",
					error: "Empty API response",
				};
			}

			return {
				success: true,
				content: data.choices[0].message.content.trim(),
			};
		} catch (error) {
			return { success: false, content: "", error: String(error) };
		}
	}

	private sanitizeFileName(name: string): string {
		return name
			.replace(/[\\/:*?"<>|]/g, "-")
			.replace(/\s+/g, " ")
			.trim();
	}

	private generateDateFileName(): string {
		const now = new Date();
		const pad = (n: number) => n.toString().padStart(2, "0");
		return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
	}

	private async ensureFolderExists(folderPath: string) {
		const folders = folderPath.split("/");
		let currentPath = "";

		for (const folder of folders) {
			currentPath = currentPath ? `${currentPath}/${folder}` : folder;
			if (!this.app.vault.getAbstractFileByPath(currentPath)) {
				await this.app.vault.createFolder(currentPath);
			}
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
