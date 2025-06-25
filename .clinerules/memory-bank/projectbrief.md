# Guidant Project Brief

**Version:** 1.0.6  
**Organization:** Fluxitude  
**License:** MIT with Commons Clause  

## Project Overview

Guidant is an AI-powered task management and project discovery system designed to automate the complete software development lifecycle from initial discovery to implementation. It serves as an intelligent project planning and execution platform that eliminates manual waiting times and provides comprehensive AI-assisted workflow automation for development teams and project managers.

### Core Purpose

Guidant transforms the traditional software development process by:
- Automating requirements gathering through AI-guided discovery sessions
- Generating comprehensive Product Requirements Documents (PRDs) from discovery data
- Breaking down complex projects into manageable, prioritized tasks
- Providing autonomous research capabilities for informed decision-making
- Integrating seamlessly with AI development tools like Cursor, Windsurf, and VS Code

### Target Users

- **Development Teams** seeking AI-assisted workflow automation
- **Project Managers** requiring intelligent project planning and tracking
- **Solo Developers** needing structured project organization
- **AI-Enhanced Development Workflows** using tools like Cursor and Claude

## Key Features and Capabilities

### 🔍 Discovery Session Management
- **AI-Guided Requirements Gathering**: Structured discovery workflows that transform project ideas into comprehensive requirements
- **Market Research Integration**: Autonomous competitive analysis and market opportunity assessment
- **Technical Feasibility Validation**: Automated architecture recommendations and technology stack validation
- **Requirements Synthesis**: Intelligent conversion of discovery findings into structured functional and non-functional requirements

### 📋 Task Management System
- **Intelligent Task Breakdown**: AI-powered decomposition of complex projects into manageable tasks
- **Dependency Management**: Automatic dependency resolution and task ordering
- **Priority-Based Scheduling**: AI-driven task prioritization using multiple criteria (business value, complexity, dependencies)
- **Tag-Based Organization**: Multi-context task management supporting branches, features, and project phases
- **Progress Tracking**: Comprehensive progress monitoring with burndown charts and velocity tracking

### 🔬 Research Integration
- **Multi-Provider AI Research**: Integration with Vertex AI (Gemini 2.5 Pro/Flash), Context7, Tavily, and Perplexity
- **Autonomous Research Agents**: Cloud-native research automation using Mastra AI workflows
- **Context-Aware Analysis**: Intelligent context gathering from tasks, files, and project structure
- **Real-Time Information**: Web search and current market data integration

### 🔧 MCP (Model Context Protocol) Integration
- **Tool Ecosystem**: Comprehensive MCP server with 40+ specialized tools
- **AI Assistant Integration**: Seamless integration with Claude, GPT, and other AI assistants
- **Extensible Architecture**: Plugin-based system for custom tool development
- **Cross-Platform Compatibility**: Works with multiple AI development environments

### ☁️ Cloud-Native Autonomous Agents
- **Mastra AI Framework**: TypeScript-first workflow orchestration for research automation
- **Google Cloud Run Deployment**: Scalable, serverless research agent deployment
- **Specialized Research Tasks**: Technology research, UI/UX analysis, competitive intelligence
- **Browser Automation**: Stagehand integration for automated UI/UX competitor discovery

## Technical Architecture

### Core Technology Stack
- **Runtime**: Node.js 18+ with TypeScript/ES Modules
- **AI Integration**: Multiple provider support (Anthropic, Google Vertex AI, OpenAI, Perplexity)
- **Cloud Platform**: Google Cloud Platform (Vertex AI, Firestore, Cloud Run)
- **Workflow Engine**: Mastra AI for autonomous agent orchestration
- **Protocol**: Model Context Protocol (MCP) for tool integration
- **Data Storage**: JSON-based with migration to Firestore in progress

### Architecture Components

#### 1. Task Management Core
- **Single Source of Truth**: `tasks.json` with tagged task lists support
- **Task Model**: Dependencies, priorities, metadata, and state management
- **File Generation**: Individual task file creation for AI workflow integration

#### 2. AI Integration Layer
- **Multi-Provider Support**: Intelligent routing based on task complexity and cost optimization
- **Research Router**: Hybrid Context7 MCP + AI fallback strategy for technical validation
- **Prompt Engineering**: Specialized prompts for different task types and research domains

#### 3. Discovery Workflow Engine
- **Session Management**: Structured discovery phases with progress tracking
- **PRD Generation**: Automated document creation from discovery data
- **Quality Assessment**: AI-powered PRD quality scoring and improvement recommendations

#### 4. MCP Server Infrastructure
- **FastMCP Framework**: High-performance MCP server implementation
- **Tool Registry**: Comprehensive tool ecosystem for task management and research
- **Integration Adapters**: Seamless connection with AI assistants and development tools

#### 5. Cloud Agent System
- **Mastra Workflows**: Autonomous research agent orchestration
- **GCP Integration**: Native cloud services integration (Firestore, Redis, Cloud Run)
- **Research Specialization**: Dedicated agents for market research, technical validation, and UX analysis

### Data Architecture
- **Current**: JSON-based file storage with tagged organization
- **Migration Target**: Firestore for cloud-native data persistence
- **Caching**: Redis integration for performance optimization
- **Backup**: Automated state preservation and recovery

## Project Goals

### Primary Objectives
1. **Eliminate Development Bottlenecks**: Remove manual waiting times across the complete workflow (Discovery → PRD → Implementation)
2. **Autonomous Workflow Execution**: Enable fully automated research and competitive analysis
3. **Intelligent Project Planning**: Provide AI-driven task breakdown and prioritization
4. **Seamless AI Integration**: Maintain backward compatibility while enhancing AI assistant capabilities

### Success Metrics
- **90%+ Cost Savings**: Through intelligent AI provider routing
- **Zero Manual Intervention**: In discovery-to-implementation workflows
- **Universal AI Compatibility**: Support for all major AI development tools
- **Production-Ready Deployment**: Cloud-native scalability and reliability

## Current Status and Roadmap

### ✅ Implemented Features
- **Core Task Management**: Complete CRUD operations with dependency management
- **Discovery Workflows**: AI-guided requirements gathering and PRD generation
- **MCP Integration**: Full MCP server with 40+ tools
- **Multi-Provider AI**: Support for 8+ AI providers with intelligent routing
- **Research Capabilities**: Context-aware research with multiple data sources
- **CLI Interface**: Comprehensive command-line tool with interactive features

### 🚧 Active Development
- **Mastra AI Integration**: Cloud-native autonomous research agents
- **Firestore Migration**: Moving from JSON to cloud-native data storage
- **Enhanced Autonomous Capabilities**: Eliminating manual stage progression
- **Browser Automation**: Stagehand integration for UI/UX research
- **Performance Optimization**: Advanced caching and cost reduction strategies

### 🎯 Upcoming Milestones
- **Q1 2025**: Complete Mastra AI agent deployment on Google Cloud Run
- **Q2 2025**: Full Firestore migration and enhanced data persistence
- **Q3 2025**: Advanced autonomous workflow capabilities

### Migration Plans
1. **Framework Transition**: Complete migration from legacy frameworks to Mastra AI
2. **Data Storage Evolution**: JSON → Firestore for improved scalability and collaboration
3. **Architecture Enhancement**: Monolithic → Microservices for specialized research and other tasks
4. **Integration Expansion**: Additional AI providers and development tool integrations

## Development Philosophy

Guidant is built on the principle of **AI-First Development**, where artificial intelligence is not just a feature but the core orchestrator of the entire development lifecycle. The project emphasizes:

- **Production-Ready Solutions**: No shortcuts, hacks, or fragile implementations
- **Scalable Architecture**: Cloud-native design for enterprise deployment
- **Developer Experience**: Seamless integration with existing development workflows
- **Cost Optimization**: Intelligent resource utilization and provider routing
- **Backward Compatibility**: Smooth migration paths for existing users

---

*This document serves as the foundation and source of truth for all Guidant development decisions and architectural choices.*
