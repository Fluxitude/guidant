# Tech Context

**Version:** 1.0.0

## Technologies Used

Guidant leverages a modern, robust technology stack to ensure scalability, performance, and maintainability.

-   **Runtime Environment:** Node.js 18+
    -   Chosen for its asynchronous, event-driven architecture, making it ideal for building scalable network applications.
-   **Language:** TypeScript
    -   Provides static typing, enhancing code quality, readability, and maintainability, especially in large codebases.
-   **Module System:** ES Modules (ESM)
    -   Modern JavaScript module system for better dependency management and tree-shaking capabilities.
-   **AI Integration:**
    -   **Anthropic (Claude):** For advanced natural language understanding and generation.
    -   **Google Vertex AI (Gemini 2.5 Pro/Flash):** For powerful AI models and scalable cloud infrastructure.
    -   **OpenAI (GPT):** For diverse AI capabilities and broad model support.
    -   **Perplexity:** For real-time information retrieval and search.
    -   **Context7:** For specialized technical documentation and code context.
    -   **Tavily:** For web search and data extraction.
-   **Cloud Platform:** Google Cloud Platform (GCP)
    -   **Cloud Run:** Serverless compute platform for deploying scalable, containerized applications (autonomous agents).
    -   **Firestore:** NoSQL document database for flexible and scalable data storage.
    -   **Redis:** In-memory data store used for caching and real-time data processing.
-   **Workflow Engine:** Mastra AI Framework
    -   A TypeScript-first framework for orchestrating complex AI workflows and autonomous agents.
-   **Protocol:** Model Context Protocol (MCP)
    -   A custom protocol for seamless integration and communication between AI assistants, tools, and development environments.
-   **Testing Frameworks:**
    -   **Jest:** For unit and integration testing.
    -   **Supertest:** For testing HTTP APIs.
-   **Code Formatting/Linting:** Biome
    -   All-in-one tool for formatting and linting, ensuring code consistency and quality.

## Development Setup

-   **Local Development:** Node.js, npm/yarn, Git.
-   **IDE:** VS Code (with recommended extensions for TypeScript, ESLint, etc.).
-   **Containerization:** Docker (for local development and deployment of Mastra AI agents).
-   **Environment Variables:** Managed via `.env` files for different environments (development, production).

## Technical Constraints

-   **AI Provider Rate Limits:** Managed through intelligent routing and retry mechanisms to avoid hitting API limits.
-   **Cost Optimization:** Continuous monitoring and optimization of AI provider usage to minimize operational costs.
-   **Data Volume:** Designed to handle large volumes of research data and task information, with Firestore as the scalable backend.
-   **Real-time Requirements:** Research and task updates aim for near real-time processing, leveraging Redis for caching.

## Dependencies

-   **External Libraries:** Managed via `package.json` and `package-lock.json`.
-   **Internal Modules:** Organized into a modular structure within the `src/` directory, with clear import paths.
-   **MCP Servers:** External MCP servers provide specialized tools and data sources, integrated via the MCP.

## Tool Usage Patterns

-   **CLI Interface:** Primary interaction point for users to initiate discovery sessions, manage tasks, and trigger research.
-   **AI Assistants:** Interact with Guidant via the MCP, invoking tools and receiving context-aware responses.
-   **Autonomous Agents:** Mastra AI agents execute research workflows, utilizing various AI providers and web scraping tools.
-   **Version Control:** Git for source code management, with a branching strategy for features and releases.
