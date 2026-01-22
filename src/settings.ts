import { App, PluginSettingTab, Setting } from "obsidian";
import ObsidigramPlugin from "./main";

export interface ObsidigramPluginSettings {
	// Telegram
	botToken: string;
	saveFolder: string;

	// OpenAI
	openaiApiKey: string;
	openaiHost: string;
	openaiModel: string;
	openaiTemperature: number;
	openaiMaxTokens: number;

	// Prompts
	systemPrompt: string;
	promptTemplate: string;

	// Validation
	minResponseLength: number;
}

export const DEFAULT_SETTINGS: ObsidigramPluginSettings = {
	// Telegram
	botToken: "",
	saveFolder: "Telegram",

	// OpenAI
	openaiApiKey: "",
	openaiHost: "https://api.openai.com",
	openaiModel: "gpt-4.1-mini",
	openaiTemperature: 0.7,
	openaiMaxTokens: 4096,

	// Prompts
	systemPrompt: "You are note-taking helper for personal knowledge base.",
	promptTemplate: `Merge these notes into a well-structured markdown document.
Preserve all information, remove duplicates, organize logically. Follow author's language.

Existing notes:
{original_content}

New notes:
{message}
`,

	// Validation
	minResponseLength: 100,
};

export class ObsidigramSettingTab extends PluginSettingTab {
	plugin: ObsidigramPlugin;

	constructor(app: App, plugin: ObsidigramPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ===== TELEGRAM =====
		containerEl.createEl("h2", { text: "📱 Telegram" });

		new Setting(containerEl)
			.setName("Bot token")
			.setDesc("Bot token from @botfather")
			.addText((text) =>
				text
					.setPlaceholder("123456:abc-def...")
					.setValue(this.plugin.settings.botToken)
					.onChange(async (value) => {
						this.plugin.settings.botToken = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Folder for files")
			.setDesc("Where to save notes (empty = root)")
			.addText((text) =>
				text
					.setPlaceholder("Telegram")
					.setValue(this.plugin.settings.saveFolder)
					.onChange(async (value) => {
						this.plugin.settings.saveFolder = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).addButton((button) =>
			button.setButtonText("Reboot bot").onClick(() => {
				this.plugin.restartBot();
			}),
		);

		// ===== OPENAI =====
		containerEl.createEl("h2", { text: "Openai" });

		new Setting(containerEl)
			.setName("Api key")
			.setDesc("Key from openapi\'s api")
			.addText((text) =>
				text
					.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.openaiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openaiApiKey = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Api host")
			.setDesc("Api host (for compatable providers)")
			.addText((text) =>
				text
					.setPlaceholder("https://api.openai.com")
					.setValue(this.plugin.settings.openaiHost)
					.onChange(async (value) => {
						this.plugin.settings.openaiHost = value.replace(
							/\/$/,
							"",
						); // убираем trailing slash
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Model name")
			.setDesc("Used llm model")
			.addText((text) =>
				text
					.setPlaceholder("gpt-4o-mini")
					.setValue(this.plugin.settings.openaiModel)
					.onChange(async (value) => {
						this.plugin.settings.openaiModel = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Temperature")
			.setDesc("Answers creativity (0.0 - 2.0)")
			.addSlider((slider) =>
				slider
					.setLimits(0, 2, 0.1)
					.setValue(this.plugin.settings.openaiTemperature)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.openaiTemperature = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Max tokens")
			.setDesc("Max message length in tokens")
			.addText((text) =>
				text
					.setPlaceholder("4096")
					.setValue(String(this.plugin.settings.openaiMaxTokens))
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0) {
							this.plugin.settings.openaiMaxTokens = num;
							await this.plugin.saveSettings();
						}
					}),
			);

		// ===== PROMPTS =====
		containerEl.createEl("h2", { text: "Prompts" });

		new Setting(containerEl)
			.setName("System prompt")
			.setDesc("System promt for llm")
			.addTextArea((text) =>
				text
					.setPlaceholder("You are note-taking app...")
					.setValue(this.plugin.settings.systemPrompt)
					.onChange(async (value) => {
						this.plugin.settings.systemPrompt = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Prompt template")
			.setDesc("Use placeholders: {original_content}, {message}")
			.addTextArea((text) =>
				text
					.setPlaceholder("Unite...")
					.setValue(this.plugin.settings.promptTemplate)
					.onChange(async (value) => {
						this.plugin.settings.promptTemplate = value;
						await this.plugin.saveSettings();
					}),
			);

		// Делаем текстовые области больше
		containerEl
			.querySelectorAll("textarea")
			.forEach((textarea: HTMLTextAreaElement) => {
				textarea.style.width = "100%";
				textarea.style.minHeight = "100px";
			});

		// ===== VALIDATION =====
		containerEl.createEl("h2", { text: "Validation" });

		new Setting(containerEl)
			.setName("Minimum reply length")
			.setDesc(
				"If AI answers more short messages — we assume it is some kind of error",
			)
			.addText((text) =>
				text
					.setPlaceholder("100")
					.setValue(String(this.plugin.settings.minResponseLength))
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num >= 0) {
							this.plugin.settings.minResponseLength = num;
							await this.plugin.saveSettings();
						}
					}),
			);
	}
}
