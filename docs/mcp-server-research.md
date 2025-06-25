# MCP Server Research for Guidant Autonomous Agents

## Overview

This document provides comprehensive research on Model Context Protocol (MCP) servers suitable for Guidant's autonomous agent architecture. The research focuses on servers that provide research, analysis, and web interaction capabilities to support the Strategic Agent Synthesis approach.

## Core MCP Servers for Guidant

### 1. Context7 MCP Server
- **Package**: `@upstash/context7-mcp`
- **Installation**: `npx -y @upstash/context7-mcp`
- **Authentication**: No API key required
- **Tools**:
  - `resolve-library-id`: Resolves library names to Context7-compatible IDs
  - `get-library-docs`: Fetches up-to-date documentation with code examples
- **Capabilities**:
  - Real-time code documentation for thousands of libraries
  - Version-specific examples and API references
  - Eliminates outdated training data issues
- **Use Case**: Technical validation and architecture research

### 2. Tavily MCP Server
- **Package**: `tavily-mcp` / `@tavily/mcp`
- **Installation**: `npx -y tavily-mcp@0.1.3`
- **Authentication**: `TAVILY_API_KEY` required
- **Tools**:
  - `tavily-search`: AI-tailored web search with filtering
  - `tavily-extract`: Intelligent data extraction from URLs
- **Capabilities**:
  - Real-time web search optimized for AI consumption
  - Domain-specific search capabilities
  - News search with date filtering
  - Research-grade result quality
- **Use Case**: Market research and competitive analysis

### 3. Firecrawl MCP Server
- **Package**: `firecrawl-mcp`
- **Installation**: `npx -y firecrawl-mcp`
- **Authentication**: `FIRECRAWL_API_KEY` required
- **Tools**:
  - `firecrawl_scrape`: Single URL content extraction
  - `firecrawl_batch_scrape`: Multiple URLs with rate limiting
  - `firecrawl_search`: Web search with content extraction
  - `firecrawl_crawl`: Asynchronous website crawling
  - `firecrawl_extract`: LLM-powered structured data extraction
  - `firecrawl_deep_research`: Autonomous research with analysis
  - `firecrawl_generate_llmstxt`: AI interaction guidelines
  - `firecrawl_check_batch_status`: Monitor batch operations
- **Capabilities**:
  - Comprehensive web scraping and crawling
  - LLM-powered content analysis
  - Structured data extraction with schemas
  - Deep research with autonomous exploration
- **Use Case**: Web content analysis and comprehensive research

### 4. Stagehand MCP Server (Browserbase)
- **Package**: `mcp-server-browserbase` (Stagehand variant)
- **Installation**: Build from `github.com/browserbase/mcp-server-browserbase`
- **Authentication**: `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `OPENAI_API_KEY`
- **Tools**:
  - `stagehand_navigate`: Navigate to URLs in cloud browser
  - `stagehand_act`: Perform natural language actions ("click login")
  - `stagehand_extract`: Extract data with instructions and schemas
  - `stagehand_observe`: Observe available page actions
- **Resources**:
  - Console logs and error tracking
  - Screenshot capabilities
- **Capabilities**:
  - AI-powered browser automation
  - Natural language web interaction
  - Dynamic content handling
  - Cloud-based browser execution
- **Use Case**: UI/UX competitor research and automated web interaction

## Supplementary MCP Servers

### GitHub MCP Server
- **Package**: `@github/github-mcp-server`
- **Capabilities**: Repository analysis, PR management, issue tracking
- **Use Case**: Technology research and competitive code analysis

### Brave Search MCP Server
- **Package**: Available in `modelcontextprotocol/servers`
- **Capabilities**: Web, image, news, video search
- **Use Case**: General web search capabilities

### Exa AI MCP Server
- **Package**: `exa-mcp-server`
- **Capabilities**: Advanced AI-powered web search
- **Use Case**: High-quality research results

## MCP Configuration Patterns

### Context7 Configuration
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

### Tavily Configuration
```json
{
  "mcpServers": {
    "tavily-mcp": {
      "command": "npx",
      "args": ["-y", "tavily-mcp@0.1.3"],
      "env": {
        "TAVILY_API_KEY": "tvly-YOUR_API_KEY"
      }
    }
  }
}
```

### Firecrawl Configuration
```json
{
  "mcpServers": {
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

### Stagehand Configuration
```json
{
  "mcpServers": {
    "stagehand": {
      "command": "node",
      "args": ["path/to/mcp-server-browserbase/stagehand/dist/index.js"],
      "env": {
        "BROWSERBASE_API_KEY": "<YOUR_BROWSERBASE_API_KEY>",
        "BROWSERBASE_PROJECT_ID": "<YOUR_BROWSERBASE_PROJECT_ID>",
        "OPENAI_API_KEY": "<YOUR_OPENAI_API_KEY>"
      }
    }
  }
}
```

## Tool Categorization for Agent Synthesis

### Complex Operations (Agent Synthesis - ~15 tools)
These tools require intelligent synthesis and should use specialized agents:

**Research & Analysis Tools**:
- `context7_resolve-library-id`
- `context7_get-library-docs`
- `tavily_search`
- `tavily_extract`
- `firecrawl_deep_research`
- `firecrawl_extract`
- `firecrawl_crawl`
- `stagehand_act`
- `stagehand_extract`
- `stagehand_observe`

**Characteristics**:
- Require multi-step reasoning
- Need context synthesis
- Produce complex outputs
- Benefit from AI analysis

### Simple Operations (Direct Calls - ~38 tools)
These tools should remain as efficient direct calls:

**Guidant CRUD Operations**:
- Task management functions
- Data retrieval operations
- Simple API calls
- Basic file operations

**Characteristics**:
- Single-step operations
- Predictable inputs/outputs
- No synthesis required
- High-frequency usage

## Integration with Mastra AI Framework

### MCPClient Setup
```typescript
import { MCPClient } from '@mastra/mcp';

const mcp = new MCPClient({
  servers: {
    context7: { 
      command: "npx", 
      args: ["-y", "@upstash/context7-mcp"] 
    },
    tavily: { 
      command: "npx", 
      args: ["-y", "tavily-mcp@0.1.3"],
      env: { TAVILY_API_KEY: process.env.TAVILY_API_KEY }
    },
    firecrawl: { 
      command: "npx", 
      args: ["-y", "firecrawl-mcp"],
      env: { FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY }
    }
  }
});
```

### Agent Integration
```typescript
import { Agent } from '@mastra/core';

const researchAgent = new Agent({
  name: "Research Synthesis Agent",
  tools: await mcp.getTools(),
  model: gemini("gemini-2.5-pro"),
  instructions: "Synthesize research from multiple sources..."
});
```

## Implementation Roadmap

1. **Phase 1**: Integrate core MCP servers (Context7, Tavily, Firecrawl)
2. **Phase 2**: Add Stagehand for browser automation
3. **Phase 3**: Implement agent synthesis logic
4. **Phase 4**: Deploy specialized research agents
5. **Phase 5**: Optimize and scale

## Environment Variables Required

```env
# Tavily
TAVILY_API_KEY=tvly-your-api-key

# Firecrawl
FIRECRAWL_API_KEY=your-firecrawl-key

# Browserbase (for Stagehand)
BROWSERBASE_API_KEY=your-browserbase-key
BROWSERBASE_PROJECT_ID=your-project-id
OPENAI_API_KEY=your-openai-key

# Existing Guidant
VERTEX_PROJECT_ID=your-gcp-project
VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

## Next Steps

1. Set up MCP server integrations in Mastra AI framework
2. Implement the four specialized synthesis agents
3. Create routing logic for tool categorization
4. Deploy agents to Google Cloud Run
5. Integrate with existing Guidant architecture

This research provides the foundation for implementing autonomous agents that can perform comprehensive research and analysis while maintaining efficiency for simple operations.
