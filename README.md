# Guidant

[![npm version](https://badge.fury.io/js/guidant.svg)](https://badge.fury.io/js/guidant) [![License: MIT with Commons Clause](https://img.shields.io/badge/license-MIT%20with%20Commons%20Clause-blue.svg)](LICENSE)

## By Fluxitude

An AI-powered task management system with discovery workflows, MCP integration, and intelligent project planning. Built for seamless integration with AI development tools like Cursor, Windsurf, and VS Code.

## Features

- **🔍 Discovery Workflows**: AI-guided requirements gathering through 5-stage process (Problem Discovery → Market Research → Technical Feasibility → Requirements Synthesis → PRD Generation)
- **🔧 MCP Integration**: 40+ Model Context Protocol tools for seamless AI integration with Cursor, Windsurf, and VS Code
- **📋 Task Management**: Comprehensive task tracking with dependencies, subtasks, and intelligent prioritization
- **🤖 Multi-Provider AI**: Support for Anthropic, OpenAI, VertexAI, Perplexity, xAI, and more with intelligent routing
- **💰 Cost Optimization**: Intelligent provider routing achieving 97%+ cost savings
- **🏃 Sprint Management**: Agile workflow support with burndown charts and velocity tracking
- **📚 Knowledge Sharing**: Built-in documentation, handoff systems, and research capabilities
- **🏷️ Tagged Task Lists**: Multi-context task management with branch-based workflows
- **📊 Analytics & Reporting**: Progress tracking, performance metrics, and comprehensive dashboards

## Installation

```bash
npm install -g guidant
```

## Quick Start

### Option 1: MCP Integration (Recommended)

MCP (Model Context Protocol) lets you run Guidant directly from your AI editor for the best experience.

#### 1. Configure MCP in your editor

Add the following configuration to your editor's MCP settings file:

| Editor       | Configuration File Path                                    |
| ------------ | --------------------------------------------------------- |
| **Cursor**   | `~/.cursor/mcp.json` or `<project>/.cursor/mcp.json`     |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json`                    |
| **VS Code**  | `<project>/.vscode/mcp.json`                             |

#### 2. MCP Configuration

**For Cursor & Windsurf:**

```json
{
    "mcpServers": {
        "guidant": {
            "command": "npx",
            "args": [
                "-y",
                "--package=guidant",
                "guidant-ai"
            ],
            "env": {
                "GUIDANT_DOCS_DIR": "./docs",
                "ANTHROPIC_API_KEY": "your-anthropic-key",
                "PERPLEXITY_API_KEY": "your-perplexity-key",
                "OPENAI_API_KEY": "your-openai-key",
                "VERTEX_PROJECT_ID": "your-vertex-project-id",
                "VERTEX_LOCATION": "us-central1",
                "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/your/credentials.json",
                "TAVILY_API_KEY": "your-tavily-key"
            }
        }
    }
}
```

**For VS Code:**

```json
{
    "servers": {
        "guidant": {
            "command": "npx",
            "args": [
                "-y",
                "--package=guidant",
                "guidant-ai"
            ],
            "env": {
                "GUIDANT_DOCS_DIR": "./docs",
                "ANTHROPIC_API_KEY": "your-anthropic-key",
                "PERPLEXITY_API_KEY": "your-perplexity-key",
                "OPENAI_API_KEY": "your-openai-key",
                "VERTEX_PROJECT_ID": "your-vertex-project-id",
                "VERTEX_LOCATION": "us-central1",
                "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/your/credentials.json",
                "TAVILY_API_KEY": "your-tavily-key"
            },
            "type": "stdio"
        }
    }
}
```

> 🔑 **Important**: Replace the placeholder values with your actual API keys and project settings. You can omit keys for providers you don't use.

#### 3. Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GUIDANT_DOCS_DIR` | Directory for documentation (usually `./docs`) | Yes |
| `ANTHROPIC_API_KEY` | Claude API key (recommended for main model) | Optional* |
| `VERTEX_PROJECT_ID` | Google Cloud project ID | Optional* |
| `VERTEX_LOCATION` | Google Cloud region (e.g., `us-central1`) | Optional* |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google Cloud credentials JSON | Optional* |
| `PERPLEXITY_API_KEY` | Perplexity API key (excellent for research) | Optional* |
| `OPENAI_API_KEY` | OpenAI API key | Optional* |
| `TAVILY_API_KEY` | Tavily search API key | Optional* |

*At least one AI provider API key is required.

#### 4. Start using Guidant in your editor

Once configured, you can use Guidant tools directly in your AI chat:

```
Initialize a new project and start discovery session for "My Web App"
```

```
Show me the next task to work on
```

```
Add a new task for implementing user authentication
```

### Option 2: CLI Usage

#### 1. Initialize a new project

```bash
guidant init
```

#### 2. Start discovery phase (recommended for new projects)

```bash
guidant start-discovery-session --project-name "My Project"
```

#### 3. Generate tasks from discovery

```bash
guidant generate-prd
guidant parse-prd
```

#### 4. Or create tasks directly

```bash
guidant add-task --prompt "Set up authentication system"
```

## Core Workflows

### Discovery-Driven Development

1. **Problem Discovery**: Define the core problem and target users
2. **Market Research**: Analyze competitors and market opportunities  
3. **Technical Feasibility**: Validate technology choices and architecture
4. **Requirements Synthesis**: Generate structured functional/non-functional requirements
5. **PRD Generation**: Create comprehensive Product Requirements Document
6. **Task Generation**: Auto-generate implementation tasks from PRD

### Task Management

- **Hierarchical Tasks**: Parent tasks with detailed subtasks
- **Dependencies**: Smart dependency tracking and validation
- **Status Management**: Track progress through multiple states
- **Priority System**: AI-powered priority assignment
- **Tagged Lists**: Organize tasks by context (branch, feature, etc.)

### AI-Powered Features

- **Smart Task Generation**: AI creates detailed, actionable tasks
- **Research Integration**: Real-time web research for technical decisions
- **Cost Optimization**: Intelligent routing between AI providers
- **Context Awareness**: Tasks understand project context and dependencies

## Available MCP Tools

Guidant provides 40+ MCP tools organized into categories:

### Project Management
- `initialize_project_guidant` - Set up new projects
- `models_guidant` - Configure AI models
- `get_work_context_guidant` - Get current work context

### Task Operations
- `get_tasks_guidant` - List all tasks
- `get_task_guidant` - Get specific task details
- `next_task_guidant` - Find next task to work on
- `add_task_guidant` - Create new tasks
- `update_task_guidant` - Update task details
- `set_task_status_guidant` - Change task status
- `remove_task_guidant` - Delete tasks

### Subtask Management
- `expand_task_guidant` - Generate subtasks
- `expand_all_guidant` - Expand all pending tasks
- `add_subtask_guidant` - Add subtasks manually
- `update_subtask_guidant` - Update subtask details
- `remove_subtask_guidant` - Remove subtasks

### Tag System
- `list_tags_guidant` - List available tags
- `add_tag_guidant` - Create new tags
- `use_tag_guidant` - Switch to different tag
- `delete_tag_guidant` - Remove tags
- `rename_tag_guidant` - Rename tags
- `copy_tag_guidant` - Copy tags

### Dependencies
- `add_dependency_guidant` - Add task dependencies
- `remove_dependency_guidant` - Remove dependencies
- `validate_dependencies_guidant` - Check dependency integrity
- `fix_dependencies_guidant` - Auto-fix dependency issues

### Analysis & Reporting
- `analyze_project_complexity_guidant` - Analyze task complexity
- `complexity_report_guidant` - View complexity reports
- `prioritize_tasks_guidant` - AI-powered task prioritization
- `generate_progress_summary_guidant` - Create progress reports
- `generate_burndown_guidant` - Generate burndown charts
- `generate_dashboard_guidant` - Create project dashboards

### Discovery & Research
- `start_discovery_session_guidant` - Begin discovery workflow
- `research_market_opportunity_guidant` - Market research
- `validate_technical_feasibility_guidant` - Technical validation
- `synthesize_requirements_guidant` - Requirements synthesis
- `generate_prd_guidant` - Generate PRD documents
- `assess_prd_quality_guidant` - Assess PRD quality
- `research_guidant` - General research queries

### Sprint Management
- `manage_sprint_guidant` - Sprint operations
- `manage_work_session_guidant` - Work session tracking
- `generate_handoff_report_guidant` - Team handoff reports
- `share_knowledge_guidant` - Knowledge sharing
- `track_performance_guidant` - Performance metrics

## API Keys & Providers

Guidant supports multiple AI providers for cost optimization and reliability:

### Recommended Setup
- **Primary**: Anthropic Claude (best quality)
- **Research**: VertexAI Gemini (cost-effective)
- **Fallback**: OpenAI GPT (reliability)

### Supported Providers
- **Anthropic** (Claude) - Premium quality, recommended for main tasks
- **VertexAI** (Google Gemini) - Cost-effective, excellent for research
- **Perplexity** - Best for web research and current information
- **OpenAI** (GPT) - Reliable fallback option
- **Tavily** - Web search and research capabilities
- **xAI, Mistral, OpenRouter** - Additional options

### Cost Optimization

Guidant automatically routes requests to the most cost-effective provider based on:
- Task complexity
- Required capabilities
- Provider availability
- Cost per token

This typically achieves 90%+ cost savings compared to using premium models for all tasks.

## Examples

### Basic Task Management

```bash
# Initialize project
guidant init

# Add a task
guidant add-task --prompt "Implement user registration API"

# Get next task
guidant next

# Update task status
guidant set-status 1 in-progress

# Expand task into subtasks
guidant expand 1 --num 5
```

### Discovery Workflow

```bash
# Start discovery session
guidant start-discovery-session --project-name "E-commerce Platform"

# Research market opportunity
guidant research-market-opportunity --target-market "B2B SaaS"

# Validate technical feasibility
guidant validate-technical-feasibility --technologies "React,Node.js,PostgreSQL"

# Generate PRD
guidant generate-prd

# Parse PRD into tasks
guidant parse-prd
```

### Tag-Based Workflows

```bash
# Create feature branch tag
guidant add-tag feature-auth --description "Authentication feature"

# Switch to tag
guidant use-tag feature-auth

# Add tasks to current tag
guidant add-task --prompt "Implement OAuth integration"

# List tasks in current tag
guidant list
```

## Configuration

### Project Configuration

Guidant creates a `.guidant/` directory in your project with:

- `config.json` - Project settings and AI model configuration
- `state.json` - Current state (active tag, session info)
- `tasks/tasks.json` - Task data and metadata
- `docs/` - Generated documentation and PRDs
- `reports/` - Analysis reports and metrics

### Model Configuration

```bash
# Set primary model
guidant models --set-main "claude-3-5-sonnet-20241022"

# Set research model
guidant models --set-research "gemini-2.5-pro"

# Set fallback model
guidant models --set-fallback "gpt-4o"

# List available models
guidant models --list-available-models
```

## Advanced Features

### Research Integration

Guidant can perform real-time research to enhance task generation:

```bash
# Research-backed task expansion
guidant expand 1 --research --num 3

# General research query
guidant research "Best practices for React authentication"
```

### Performance Tracking

```bash
# Generate burndown chart
guidant generate-burndown --type sprint

# Create progress dashboard
guidant generate-dashboard --type project

# Track performance metrics
guidant track-performance --action analyze
```

### Team Collaboration

```bash
# Generate handoff report
guidant generate-handoff-report --type daily

# Share knowledge document
guidant share-knowledge --action create --topic "API Architecture"

# Generate progress summary
guidant generate-progress-summary --audience management
```

## Troubleshooting

### Common Issues

1. **MCP Server Not Starting**
   - Ensure `GUIDANT_DOCS_DIR` is set
   - Check that at least one AI provider API key is configured
   - Verify the project directory exists

2. **API Key Issues**
   - Verify API keys are valid and have sufficient credits
   - Check environment variable names match exactly
   - For VertexAI, ensure `GOOGLE_APPLICATION_CREDENTIALS` points to valid JSON file

3. **Task Generation Failures**
   - Check AI provider status and quotas
   - Verify model configuration with `guidant models`
   - Try switching to a different provider

### Debug Mode

Enable debug logging:

```bash
export DEBUG=guidant:*
guidant <command>
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT with Commons Clause - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issues](https://github.com/fluxitude/guidant/issues)
- 💬 [Discussions](https://github.com/fluxitude/guidant/discussions)
