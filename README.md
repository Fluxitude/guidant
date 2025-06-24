# Guidant

[![npm version](https://badge.fury.io/js/guidant.svg)](https://badge.fury.io/js/guidant) [![License: MIT with Commons Clause](https://img.shields.io/badge/license-MIT%20with%20Commons%20Clause-blue.svg)](LICENSE)

## By Fluxitude

An AI-powered task management system with discovery workflows, MCP integration, and intelligent project planning. Built for seamless integration with AI development tools like Cursor.

## Features

- **🔍 Discovery Workflows**: AI-guided requirements gathering through 5-stage process (Problem Discovery → Market Research → Technical Feasibility → Requirements Synthesis → PRD Generation)
- **🔧 MCP Integration**: 19+ Model Context Protocol tools for seamless AI integration with Cursor, Windsurf, and VS Code
- **📋 Task Management**: Comprehensive task tracking with dependencies, subtasks, and intelligent prioritization
- **🤖 Multi-Provider AI**: Support for Anthropic, OpenAI, VertexAI, Perplexity, xAI, and more with intelligent routing
- **💰 Cost Optimization**: Intelligent provider routing achieving 97%+ cost savings
- **🏃 Sprint Management**: Agile workflow support with burndown charts and velocity tracking
- **📚 Knowledge Sharing**: Built-in documentation, handoff systems, and research capabilities

## Installation

```bash
npm install -g guidant
```

## Quick Start

1. **Initialize a new project:**
```bash
guidant init
```

2. **Start discovery phase (recommended for new projects):**
```bash
guidant start-discovery-session --project-name "My Project"
```

3. **Generate tasks from discovery:**
```bash
guidant generate-prd
guidant parse-prd
```

4. **Or create tasks directly:**
```bash
guidant add-task --prompt "Set up authentication system"
```

## API Keys

Guidant supports multiple AI providers. You need at least one API key:

- **Anthropic** (Claude) - Recommended for main model
- **VertexAI** (Google) - Cost-effective for research
- **Perplexity** - Excellent for research queries
- **OpenAI** (GPT) - Alternative main model
- **Tavily** - Web search and research
- **xAI, Mistral, OpenRouter** - Additional options

Set up your keys in `.env`:

```env
ANTHROPIC_API_KEY=your_key_here
VERTEX_PROJECT_ID=your_project_id
TAVILY_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
```

## Quick Start

### Option 1: MCP (Recommended)

MCP (Model Control Protocol) lets you run Guidant directly from your editor.

#### 1. Add your MCP config at the following path depending on your editor

| Editor       | Scope   | Linux/macOS Path                      | Windows Path                                      | Key          |
| ------------ | ------- | ------------------------------------- | ------------------------------------------------- | ------------ |
| **Cursor**   | Global  | `~/.cursor/mcp.json`                  | `%USERPROFILE%\.cursor\mcp.json`                  | `mcpServers` |
|              | Project | `<project_folder>/.cursor/mcp.json`   | `<project_folder>\.cursor\mcp.json`               | `mcpServers` |
| **Windsurf** | Global  | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` | `mcpServers` |
| **VS Code**  | Project | `<project_folder>/.vscode/mcp.json`   | `<project_folder>\.vscode\mcp.json`               | `servers`    |

##### Manual Configuration

###### Cursor & Windsurf (`mcpServers`)

```json
{
  "mcpServers": {
    "guidant": {
      "command": "npx",
      "args": ["-y", "--package=guidant", "guidant-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "YOUR_ANTHROPIC_API_KEY_HERE",
        "PERPLEXITY_API_KEY": "YOUR_PERPLEXITY_API_KEY_HERE",
        "OPENAI_API_KEY": "YOUR_OPENAI_KEY_HERE",
        "GOOGLE_API_KEY": "YOUR_GOOGLE_KEY_HERE",
        "MISTRAL_API_KEY": "YOUR_MISTRAL_KEY_HERE",
        "OPENROUTER_API_KEY": "YOUR_OPENROUTER_KEY_HERE",
        "XAI_API_KEY": "YOUR_XAI_KEY_HERE",
        "AZURE_OPENAI_API_KEY": "YOUR_AZURE_KEY_HERE",
        "OLLAMA_API_KEY": "YOUR_OLLAMA_API_KEY_HERE"
      }
    }
  }
}
```

> 🔑 Replace `YOUR_…_KEY_HERE` with your real API keys. You can remove keys you don't use.

###### VS Code (`servers` + `type`)

```json
{
  "servers": {
    "guidant": {
      "command": "npx",
      "args": ["-y", "--package=guidant", "guidant-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "YOUR_ANTHROPIC_API_KEY_HERE",
        "PERPLEXITY_API_KEY": "YOUR_PERPLEXITY_API_KEY_HERE",
        "OPENAI_API_KEY": "YOUR_OPENAI_KEY_HERE",
        "GOOGLE_API_KEY": "YOUR_GOOGLE_KEY_HERE",
        "MISTRAL_API_KEY": "YOUR_MISTRAL_KEY_HERE",
        "OPENROUTER_API_KEY": "YOUR_OPENROUTER_KEY_HERE",
        "XAI_API_KEY": "YOUR_XAI_KEY_HERE",
        "AZURE_OPENAI_API_KEY": "YOUR_AZURE_KEY_HERE"
      },
      "type": "stdio"
    }
  }
}
```

> 🔑 Replace `YOUR_…_KEY_HERE` with your real API keys. You can remove keys you don't use.


