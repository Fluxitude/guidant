/**
 * core/conversation/conversation-coordinator.js
 * Intelligent conversation coordination for natural workflow management
 */

import { callAiService } from '../../../scripts/modules/ai-services-unified.js';

/**
 * Conversation Coordinator - Manages intelligent tool orchestration
 */
export class ConversationCoordinator {
    constructor() {
        this.conversationHistory = [];
        this.activeContext = {};
        this.toolSuggestions = [];
        this.workflowState = 'idle';
    }

    /**
     * Process user input and determine appropriate tool orchestration
     */
    async processUserInput(userInput, availableTools, currentContext = {}) {
        try {
            // Update conversation history
            this.conversationHistory.push({
                type: 'user',
                content: userInput,
                timestamp: new Date().toISOString()
            });

            // Analyze user intent
            const intent = await this.analyzeUserIntent(userInput, currentContext);
            
            // Determine tool orchestration
            const orchestration = await this.determineToolOrchestration(intent, availableTools, currentContext);
            
            // Update active context
            this.activeContext = { ...this.activeContext, ...intent.context };
            
            return {
                intent,
                orchestration,
                suggestions: this.generateSuggestions(intent, orchestration),
                context: this.activeContext
            };

        } catch (error) {
            console.error('Conversation coordination failed:', error);
            return {
                intent: { type: 'unknown', confidence: 0 },
                orchestration: { tools: [], workflow: 'manual' },
                suggestions: ['Try rephrasing your request or use specific tool names'],
                context: this.activeContext
            };
        }
    }

    /**
     * Analyze user intent using AI
     */
    async analyzeUserIntent(userInput, currentContext) {
        const prompt = `Analyze the user's intent from this input: "${userInput}"

Current context:
- Workflow state: ${this.workflowState}
- Active project: ${currentContext.projectName || 'Unknown'}
- Recent activity: ${this.conversationHistory.slice(-3).map(h => h.content).join(', ')}

Classify the intent into one of these categories:
1. discovery - Starting new project discovery or research
2. planning - Sprint planning, task prioritization, or project organization
3. development - Working on tasks, coding, implementation
4. collaboration - Team communication, handoffs, knowledge sharing
5. monitoring - Progress tracking, status updates, reporting
6. memory - Remembering context, resuming work, session management
7. research - Technical research, market analysis, documentation lookup
8. workflow - General workflow management, automation

Provide response in JSON format:
{
  "type": "category",
  "confidence": 0.8,
  "keywords": ["key", "words", "extracted"],
  "context": {
    "projectPhase": "discovery|planning|development|deployment",
    "urgency": "low|medium|high",
    "scope": "task|sprint|project",
    "audience": "self|team|stakeholder"
  },
  "suggestedTools": ["tool1", "tool2"],
  "reasoning": "Why this classification was chosen"
}`;

        try {
            const result = await callAiService({
                prompt,
                outputType: 'mcp',
                commandName: 'conversation_coordinator'
            });

            if (result.success) {
                return JSON.parse(result.response);
            }
        } catch (error) {
            // Fallback to keyword-based analysis
        }

        return this.fallbackIntentAnalysis(userInput);
    }

    /**
     * Fallback intent analysis using keywords
     */
    fallbackIntentAnalysis(userInput) {
        const input = userInput.toLowerCase();
        
        const intentPatterns = {
            discovery: ['start', 'begin', 'new project', 'discover', 'research', 'market', 'feasibility'],
            planning: ['plan', 'sprint', 'prioritize', 'organize', 'schedule', 'backlog'],
            development: ['code', 'implement', 'build', 'develop', 'task', 'work on'],
            collaboration: ['team', 'handoff', 'share', 'meeting', 'report', 'communicate'],
            monitoring: ['status', 'progress', 'track', 'monitor', 'dashboard', 'metrics'],
            memory: ['remember', 'context', 'resume', 'session', 'what was i', 'continue'],
            research: ['documentation', 'docs', 'technical', 'api', 'library', 'framework'],
            workflow: ['workflow', 'automate', 'process', 'manage', 'organize']
        };

        let bestMatch = { type: 'workflow', confidence: 0.3 };
        
        for (const [type, keywords] of Object.entries(intentPatterns)) {
            const matches = keywords.filter(keyword => input.includes(keyword)).length;
            const confidence = matches / keywords.length;
            
            if (confidence > bestMatch.confidence) {
                bestMatch = { type, confidence };
            }
        }

        return {
            type: bestMatch.type,
            confidence: bestMatch.confidence,
            keywords: input.split(' ').filter(word => word.length > 3),
            context: {
                projectPhase: 'unknown',
                urgency: 'medium',
                scope: 'task',
                audience: 'self'
            },
            suggestedTools: this.getToolsForIntent(bestMatch.type),
            reasoning: `Keyword-based classification with ${Math.round(bestMatch.confidence * 100)}% confidence`
        };
    }

    /**
     * Determine tool orchestration based on intent
     */
    async determineToolOrchestration(intent, availableTools, currentContext) {
        const orchestrationPatterns = {
            discovery: {
                workflow: 'sequential',
                tools: [
                    'start_discovery_session',
                    'research_market_opportunity',
                    'validate_technical_feasibility',
                    'synthesize_requirements',
                    'generate_prd',
                    'assess_prd_quality'
                ],
                description: 'Complete discovery workflow from research to PRD'
            },
            planning: {
                workflow: 'conditional',
                tools: [
                    'prioritize_tasks',
                    'manage_sprint',
                    'generate_burndown'
                ],
                description: 'Sprint planning and task organization'
            },
            development: {
                workflow: 'contextual',
                tools: [
                    'get_work_context',
                    'manage_work_session'
                ],
                description: 'Development workflow support'
            },
            collaboration: {
                workflow: 'parallel',
                tools: [
                    'generate_handoff_report',
                    'share_knowledge',
                    'generate_progress_summary'
                ],
                description: 'Team collaboration and knowledge sharing'
            },
            monitoring: {
                workflow: 'reporting',
                tools: [
                    'generate_progress_summary',
                    'generate_burndown',
                    'get_work_context'
                ],
                description: 'Progress monitoring and reporting'
            },
            memory: {
                workflow: 'session',
                tools: [
                    'manage_work_session',
                    'get_work_context'
                ],
                description: 'Session and context management'
            },
            research: {
                workflow: 'research',
                tools: [
                    'research_market_opportunity',
                    'validate_technical_feasibility'
                ],
                description: 'Research and technical validation'
            }
        };

        const pattern = orchestrationPatterns[intent.type] || orchestrationPatterns.workflow;
        
        // Filter tools based on availability
        const availableToolNames = availableTools.map(t => t.name);
        const filteredTools = pattern.tools.filter(tool => availableToolNames.includes(tool));

        return {
            workflow: pattern.workflow,
            tools: filteredTools,
            description: pattern.description,
            sequence: this.generateToolSequence(filteredTools, intent, currentContext),
            parallel: pattern.workflow === 'parallel'
        };
    }

    /**
     * Generate tool execution sequence
     */
    generateToolSequence(tools, intent, currentContext) {
        const sequence = [];
        
        switch (intent.type) {
            case 'discovery':
                // Sequential discovery workflow
                sequence.push(
                    { tool: 'start_discovery_session', priority: 1, required: true },
                    { tool: 'research_market_opportunity', priority: 2, required: false },
                    { tool: 'validate_technical_feasibility', priority: 3, required: false },
                    { tool: 'synthesize_requirements', priority: 4, required: true },
                    { tool: 'generate_prd', priority: 5, required: true },
                    { tool: 'assess_prd_quality', priority: 6, required: false }
                );
                break;
                
            case 'planning':
                sequence.push(
                    { tool: 'prioritize_tasks', priority: 1, required: false },
                    { tool: 'manage_sprint', priority: 2, required: true }
                );
                break;
                
            case 'memory':
                sequence.push(
                    { tool: 'get_work_context', priority: 1, required: true },
                    { tool: 'manage_work_session', priority: 2, required: false }
                );
                break;
                
            default:
                // Default sequence based on tool availability
                tools.forEach((tool, index) => {
                    sequence.push({ tool, priority: index + 1, required: false });
                });
        }
        
        return sequence.filter(item => tools.includes(item.tool));
    }

    /**
     * Generate suggestions for the user
     */
    generateSuggestions(intent, orchestration) {
        const suggestions = [];
        
        // Intent-based suggestions
        switch (intent.type) {
            case 'discovery':
                suggestions.push(
                    'Start with a discovery session to gather requirements',
                    'Research market opportunities and competition',
                    'Validate technical feasibility with Context7'
                );
                break;
                
            case 'planning':
                suggestions.push(
                    'Prioritize tasks based on business value',
                    'Create a new sprint with specific goals',
                    'Generate burndown charts for progress tracking'
                );
                break;
                
            case 'memory':
                suggestions.push(
                    'Check what you were working on recently',
                    'Resume your last work session',
                    'Save current context for later'
                );
                break;
                
            case 'collaboration':
                suggestions.push(
                    'Generate a handoff report for your team',
                    'Create knowledge documentation',
                    'Share progress summary with stakeholders'
                );
                break;
                
            default:
                suggestions.push(
                    'Use specific commands for better assistance',
                    'Try "What was I working on?" for context',
                    'Start a discovery session for new projects'
                );
        }
        
        // Tool-specific suggestions
        if (orchestration.tools.length > 0) {
            suggestions.push(`Available tools: ${orchestration.tools.join(', ')}`);
        }
        
        return suggestions;
    }

    /**
     * Get recommended tools for intent type
     */
    getToolsForIntent(intentType) {
        const toolMappings = {
            discovery: ['start_discovery_session', 'research_market_opportunity'],
            planning: ['prioritize_tasks', 'manage_sprint'],
            development: ['get_work_context', 'manage_work_session'],
            collaboration: ['generate_handoff_report', 'share_knowledge'],
            monitoring: ['generate_progress_summary', 'generate_burndown'],
            memory: ['get_work_context', 'manage_work_session'],
            research: ['research_market_opportunity', 'validate_technical_feasibility'],
            workflow: ['get_work_context', 'generate_progress_summary']
        };
        
        return toolMappings[intentType] || [];
    }

    /**
     * Update workflow state
     */
    updateWorkflowState(newState) {
        this.workflowState = newState;
    }

    /**
     * Get conversation summary
     */
    getConversationSummary() {
        return {
            totalInteractions: this.conversationHistory.length,
            currentState: this.workflowState,
            activeContext: this.activeContext,
            recentActivity: this.conversationHistory.slice(-5)
        };
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
        this.activeContext = {};
        this.workflowState = 'idle';
    }
}
