# Guidant Mastra Service

## Strategic Agent Synthesis Architecture

This service implements the Strategic Agent Synthesis Architecture for Guidant, optimizing complex operations with AI agents while preserving direct tool calls for simple operations.

## Architecture Overview

The architecture follows a strategic approach where complex operations use agent synthesis while simple operations remain direct calls, optimizing efficiency. The system intelligently routes requests to specialized agents based on complexity analysis and domain requirements.

### Core Components

1. **Strategic Agent Synthesis Router** (`router.ts`) - Intelligent routing logic that analyzes request complexity and routes operations to specialized agents or direct tool calls

2. **MCP Server Configuration** (`server-config.ts`) - Integration with Context7, Tavily, Firecrawl, and Stagehand

3. **Main Orchestration** (`index.ts`) - Central application with error handling and MCP client management

4. **Specialized Agents**:
   - **Technical Research Agent** - For library documentation and architecture recommendations
   - **Market Research Agent** - For competitive intelligence and market trends
   - **UI/UX Research Agent** - Specializes in competitor UI analysis using Stagehand
   - **General Research Agent** - Orchestrates complex research tasks

5. **Express Server** (`server.ts`) - Implements API endpoints for synthesis operations

6. **Configuration Utility** (`config.ts`) - Loads and validates configuration

## Getting Started

### Prerequisites

- Node.js 20+
- Redis (for state management)
- API keys for Mastra, Context7, Tavily, Firecrawl, and Stagehand

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your API keys
4. Build the project:
   ```bash
   npm run build
   ```
5. Start the server:
   ```bash
   npm start
   ```

### Development

For development with hot reloading:
```bash
npm run dev
```

## Deployment

### Docker

Build the Docker image:
```bash
docker build -t guidant-mastra-service .
```

Run the container:
```bash
docker run -p 8080:8080 --env-file .env guidant-mastra-service
```

### Google Cloud Run

Deploy to Cloud Run:
```bash
gcloud run deploy guidant-mastra-service \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## API Endpoints

- `POST /api/research` - Perform research operations
- `POST /api/technical` - Validate technical feasibility
- `POST /api/market` - Analyze market opportunities
- `POST /api/uiux` - Research UI/UX patterns
- `GET /health` - Health check endpoint

## Architecture Diagram

```
User Request → Router → Research Agent → Technical Agent → Market Agent → UI/UX Agent
                     → Direct Tool Call (for simple operations)
```

## License

This project is proprietary and confidential. 