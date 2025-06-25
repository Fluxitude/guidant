# System Patterns

**Version:** 1.0.0

## System Architecture

Guidant employs a modular, AI-driven architecture designed for scalability, extensibility, and efficient workflow automation. The core components interact through well-defined interfaces, leveraging the Model Context Protocol (MCP) for tool integration and a cloud-native approach for autonomous agents.

### High-Level Overview

```mermaid
graph TD
    User --> CLI[CLI Interface]
    User --> AI_Assistants[AI Assistants (Claude, GPT)]

    CLI --> TaskManagement[Task Management Core]
    AI_Assistants --> TaskManagement

    TaskManagement --> DiscoveryEngine[Discovery Workflow Engine]
    TaskManagement --> ResearchIntegration[Research Integration]
    TaskManagement --> MCPServer[MCP Server]

    DiscoveryEngine --> PRD[PRD Generation]
    ResearchIntegration --> CloudAgents[Cloud-Native Autonomous Agents]
    MCPServer --> Tools[Specialized Tools]

    CloudAgents --> GCP[Google Cloud Platform]
    GCP --> Firestore[Firestore]
    GCP --> CloudRun[Cloud Run]
    GCP --> Redis[Redis]

    ResearchIntegration --> AIProviders[AI Providers (Vertex AI, Context7, Tavily, Perplexity)]
    CloudAgents --> AIProviders

    subgraph Data Storage
        Firestore
        JSON[JSON-based Files (Legacy)]
        Redis
    end

    TaskManagement --> DataStorage
    DiscoveryEngine --> DataStorage
    ResearchIntegration --> DataStorage
```

## Key Technical Decisions

1.  **AI-First Orchestration:** AI is not just a feature but the core orchestrator of the entire development lifecycle. This means workflows are designed around AI capabilities, with human intervention primarily for guidance and validation.
2.  **Modular Design:** Components are loosely coupled, allowing for independent development, deployment, and scaling. This enhances maintainability and flexibility.
3.  **Cloud-Native Deployment:** Leveraging Google Cloud Platform (GCP) services like Cloud Run for serverless execution and Firestore for scalable data storage ensures high availability and cost-efficiency.
4.  **Model Context Protocol (MCP):** Central to Guidant's extensibility, MCP enables seamless integration of diverse tools and AI assistants, fostering a rich ecosystem.
5.  **TypeScript/Node.js:** Chosen for its robust ecosystem, strong typing, and performance characteristics, facilitating the development of complex, scalable applications.

## Design Patterns in Use

-   **Orchestration Pattern:** The Mastra AI Framework orchestrates complex workflows involving multiple AI agents and tools, managing their execution, data flow, and error handling.
-   **Adapter Pattern:** Used within the MCP Server and AI Integration Layer to provide a unified interface for diverse AI providers and external tools, abstracting away their specific APIs.
-   **Strategy Pattern:** Employed in the AI Integration Layer for intelligent routing of requests to different AI providers based on criteria like cost, performance, and task complexity.
-   **Repository Pattern:** Abstracting data access logic, particularly during the migration from JSON files to Firestore, ensuring a clean separation between domain logic and data persistence.
-   **Event-Driven Architecture:** Components communicate via events, promoting loose coupling and responsiveness, especially in asynchronous operations like autonomous research.

## Component Relationships

-   **Task Management Core:** Acts as the central hub, managing project tasks, their dependencies, and states. It triggers discovery sessions and research tasks.
-   **Discovery Workflow Engine:** Guided by the Task Management Core, it facilitates AI-driven requirements gathering and generates PRDs, which then feed back into task creation.
-   **Research Integration:** Receives research queries from the Task Management Core and dispatches them to Cloud-Native Autonomous Agents or directly to AI Providers, returning insights.
-   **MCP Server:** Exposes a suite of specialized tools that can be invoked by AI Assistants or internal components, providing capabilities like file manipulation, code analysis, and external API interactions.
-   **Cloud-Native Autonomous Agents:** Deployed on Cloud Run, these agents execute specialized research tasks, leveraging AI Providers and interacting with data storage.

## Critical Implementation Paths

1.  **Discovery to Task Flow:** The seamless transition from an AI-guided discovery session to the generation of a structured PRD and subsequent breakdown into actionable tasks. This path is critical for automating project initiation.
2.  **Autonomous Research Loop:** The process of identifying a research need, dispatching it to an appropriate agent/provider, executing the research, and integrating the findings back into the relevant task context. This underpins Guidant's real-time intelligence.
3.  **MCP Tool Invocation:** The reliable and secure execution of specialized tools via the MCP, ensuring that AI assistants can effectively interact with the development environment and external services.
4.  **Data Persistence and Migration:** The ongoing migration from JSON-based storage to Firestore, ensuring data integrity, scalability, and efficient access for all components.
