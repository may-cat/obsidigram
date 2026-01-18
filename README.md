# Telegram to Obsidian AI Bridge aka Obsidigram

A plugin for [Obsidian](https://obsidian.md) that captures messages from a Telegram bot and intelligently merges them into your notes using AI.

## Description

This plugin creates a seamless bridge between Telegram and your Obsidian vault. Send quick thoughts, ideas, or notes to your personal Telegram bot from anywhere — the plugin receives them, processes through an OpenAI-compatible API, and intelligently merges the content into your existing notes.

### Key Features

- **Telegram Integration**: Connects to your personal Telegram bot via long polling
- **AI-Powered Merging**: Uses OpenAI (or compatible APIs) to intelligently combine new messages with existing note content
- **Smart File Naming**: First line under 100 characters becomes the filename; otherwise generates timestamp-based names
- **Append or Create**: Automatically appends to existing notes or creates new ones
- **Customizable Prompts**: Full control over system prompt and merge template
- **Error Protection**: Won't overwrite files if AI returns an error or suspiciously short response

### How It Works

- You send a message to your Telegram bot
- Plugin receives the message and reads the target file (if exists)
- AI merges the new content with existing content
- Result is saved to your vault

## Installation

### Prerequisites

- https://obsidian.md v1.0.0 or higher
- A Telegram bot token (from https://t.me/BotFather)
- An OpenAI API key (or compatible provider)

### Manual Installation

- Download the latest release from the https://github.com/may-cat/obsidigram/releases page
- Extract the archive into your vault's `.obsidian/plugins/` directory
- Reload Obsidian
- Enable the plugin in Settings → Community Plugins

### Building from Source

```bash
# Clone the repository
git clone https://github.com/may-cat/obsidigram.git
cd obsidigram

# Install dependencies
npm install

# Build
npm run build

# Copy to your vault
cp main.js manifest.json /path/to/vault/.obsidian/plugins/obsidigram/
```

## Usage

### Initial Setup

1. Create a Telegram Bot

- Message @BotFather on Telegram
- Send /newbot and follow the instructions
- Copy the bot token

2. Configure the Plugin

- Open Obsidian Settings → Obsidigram
- Paste your Telegram bot token
- Enter your OpenAI API key
- Adjust other settings as needed

3. Start Using

- Send a message to your bot
- Watch it appear in your vault!

### Message Format

**With custom filename** (first line < 100 characters):

```
myfilename
Some text
- maybee with bullet points
- And more
And more
```

→ Creates/updates Telegram/`myfilename`.md

**With auto-generated filename** (first line ≥ 100 characters):

```
This is a very long thought that I want to capture quickly without thinking about organization or structure...
```

→ Creates Telegram/`2024-01-15-14-30-45`.md, where `2024-01-15-14-30-45` is current datetime.

## Custom Prompt Template

Use these placeholders in your prompt template:

`{original_content}` — Current file content (empty string if new file)
`{message}` — The incoming Telegram message

Example template:
```
Merge these notes into a well-structured markdown document.
Preserve all information, remove duplicates, organize logically.

Existing notes:
{original_content}

New notes:
{message}
```


## Using with Alternative AI Providers

The plugin works with any OpenAI-compatible API:

Provider | API Host
--|--
OpenAI | https://api.openai.com
Azure OpenAI | https://your-resource.openai.azure.com
OpenRouter | https://openrouter.ai/api
Local (Ollama) | http://localhost:11434
Local (LM Studio) | http://localhost:1234
BotHub | https://bothub.chat/api/v2/openai
 
## License

MIT License — see LICENSE for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
