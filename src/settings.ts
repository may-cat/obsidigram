import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from './main';

export interface MyPluginSettings {
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

export const DEFAULT_SETTINGS: MyPluginSettings = {
    // Telegram
    botToken: '',
    saveFolder: 'Telegram',

    // OpenAI
    openaiApiKey: '',
    openaiHost: 'https://api.openai.com',
    openaiModel: 'gpt-4.1-mini',
    openaiTemperature: 0.7,
    openaiMaxTokens: 4096,

    // Prompts
    systemPrompt: 'Ты помощник для ведения заметок. Отвечай только на русском языке.',
    promptTemplate: `Объедини два файла в виде markdown статьи в стиле wikipedia. Возвращай только объединённый результат в виде markdown.

Первый файл:
{original_content}

Второй файл:
{message}`,

    // Validation
    minResponseLength: 100
};

export class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // ===== TELEGRAM =====
        containerEl.createEl('h2', { text: '📱 Telegram' });

        new Setting(containerEl)
            .setName('Bot Token')
            .setDesc('Токен бота от @BotFather')
            .addText(text => text
                .setPlaceholder('123456:ABC-DEF...')
                .setValue(this.plugin.settings.botToken)
                .onChange(async (value) => {
                    this.plugin.settings.botToken = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Папка для сохранения')
            .setDesc('Куда сохранять заметки (пусто = корень)')
            .addText(text => text
                .setPlaceholder('Telegram')
                .setValue(this.plugin.settings.saveFolder)
                .onChange(async (value) => {
                    this.plugin.settings.saveFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('🔄 Перезапустить бота')
                .onClick(() => {
                    this.plugin.restartBot();
                }));

        // ===== OPENAI =====
        containerEl.createEl('h2', { text: '🤖 OpenAI' });

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Ключ API OpenAI')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.openaiApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.openaiApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('API Host')
            .setDesc('Хост API (для совместимых провайдеров)')
            .addText(text => text
                .setPlaceholder('https://api.openai.com')
                .setValue(this.plugin.settings.openaiHost)
                .onChange(async (value) => {
                    this.plugin.settings.openaiHost = value.replace(/\/$/, ''); // убираем trailing slash
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Модель')
            .setDesc('Название модели')
            .addText(text => text
                .setPlaceholder('gpt-4o-mini')
                .setValue(this.plugin.settings.openaiModel)
                .onChange(async (value) => {
                    this.plugin.settings.openaiModel = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Temperature')
            .setDesc('Креативность ответов (0.0 - 2.0)')
            .addSlider(slider => slider
                .setLimits(0, 2, 0.1)
                .setValue(this.plugin.settings.openaiTemperature)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.openaiTemperature = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max Tokens')
            .setDesc('Максимальная длина ответа в токенах')
            .addText(text => text
                .setPlaceholder('4096')
                .setValue(String(this.plugin.settings.openaiMaxTokens))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.openaiMaxTokens = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // ===== PROMPTS =====
        containerEl.createEl('h2', { text: '📝 Промпты' });

        new Setting(containerEl)
            .setName('System Prompt')
            .setDesc('Системный промпт для AI')
            .addTextArea(text => text
                .setPlaceholder('Ты помощник...')
                .setValue(this.plugin.settings.systemPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.systemPrompt = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Шаблон промпта')
            .setDesc('Плейсхолдеры: {original_content}, {message}')
            .addTextArea(text => text
                .setPlaceholder('Объедини...')
                .setValue(this.plugin.settings.promptTemplate)
                .onChange(async (value) => {
                    this.plugin.settings.promptTemplate = value;
                    await this.plugin.saveSettings();
                }));

        // Делаем текстовые области больше
        containerEl.querySelectorAll('textarea').forEach((textarea: HTMLTextAreaElement) => {
            textarea.style.width = '100%';
            textarea.style.minHeight = '100px';
        });

        // ===== VALIDATION =====
        containerEl.createEl('h2', { text: '⚙️ Валидация' });

        new Setting(containerEl)
            .setName('Минимальная длина ответа')
            .setDesc('Если ответ AI короче — считаем ошибкой')
            .addText(text => text
                .setPlaceholder('100')
                .setValue(String(this.plugin.settings.minResponseLength))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 0) {
                        this.plugin.settings.minResponseLength = num;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}
