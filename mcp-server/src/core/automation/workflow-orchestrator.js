/**
 * core/automation/workflow-orchestrator.js
 * Advanced workflow orchestration with AI-driven tool coordination
 */

import { ConversationCoordinator } from '../conversation/conversation-coordinator.js';
import { ContextAwareResponseSystem } from '../conversation/context-aware-responses.js';
import { generateTextService } from '../../../scripts/modules/ai-services-unified.js';

/**
 * Workflow Orchestrator - Manages complex multi-tool workflows
 */
export class WorkflowOrchestrator {
    constructor() {
        this.conversationCoordinator = new ConversationCoordinator();
        this.responseSystem = new ContextAwareResponseSystem();
        this.activeWorkflows = new Map();
        this.workflowTemplates = this.initializeWorkflowTemplates();
    }

    /**
     * Execute a complete workflow based on user input
     */
    async executeWorkflow(userInput, availableTools, context = {}) {
        try {
            // Analyze user intent and determine workflow
            const coordination = await this.conversationCoordinator.processUserInput(
                userInput, 
                availableTools, 
                context
            );

            // Create workflow execution plan
            const workflowPlan = await this.createWorkflowPlan(coordination, context);
            
            // Execute workflow steps
            const executionResults = await this.executeWorkflowSteps(workflowPlan, availableTools, context);
            
            // Generate comprehensive response
            const response = await this.generateWorkflowResponse(
                userInput,
                coordination,
                executionResults,
                context
            );

            return {
                success: true,
                workflow: workflowPlan,
                results: executionResults,
                response,
                suggestions: this.generateWorkflowSuggestions(coordination, executionResults)
            };

        } catch (error) {
            console.error('Workflow execution failed:', error);
            return {
                success: false,
                error: error.message,
                response: `Workflow execution encountered an error: ${error.message}`,
                suggestions: ['Try breaking down your request into smaller steps', 'Use specific tool names for better results']
            };
        }
    }

    /**
     * Create detailed workflow execution plan
     */
    async createWorkflowPlan(coordination, context) {
        const { intent, orchestration } = coordination;
        
        // Get workflow template
        const template = this.workflowTemplates[intent.type] || this.workflowTemplates.default;
        
        // Customize workflow based on context
        const customizedSteps = await this.customizeWorkflowSteps(template.steps, context, intent);
        
        const workflowPlan = {
            id: `workflow_${Date.now()}`,
            type: intent.type,
            name: template.name,
            description: template.description,
            steps: customizedSteps,
            estimatedDuration: this.estimateWorkflowDuration(customizedSteps),
            dependencies: this.analyzeDependencies(customizedSteps),
            parallelizable: orchestration.parallel || false
        };

        // Store active workflow
        this.activeWorkflows.set(workflowPlan.id, {
            plan: workflowPlan,
            status: 'planned',
            startTime: new Date().toISOString(),
            results: []
        });

        return workflowPlan;
    }

    /**
     * Execute workflow steps with intelligent coordination
     */
    async executeWorkflowSteps(workflowPlan, availableTools, context) {
        const workflowExecution = this.activeWorkflows.get(workflowPlan.id);
        workflowExecution.status = 'executing';

        const results = [];
        const toolMap = new Map(availableTools.map(tool => [tool.name, tool]));

        try {
            if (workflowPlan.parallelizable) {
                // Execute steps in parallel
                results.push(...await this.executeParallelSteps(workflowPlan.steps, toolMap, context));
            } else {
                // Execute steps sequentially
                results.push(...await this.executeSequentialSteps(workflowPlan.steps, toolMap, context));
            }

            workflowExecution.status = 'completed';
            workflowExecution.results = results;
            workflowExecution.endTime = new Date().toISOString();

        } catch (error) {
            workflowExecution.status = 'failed';
            workflowExecution.error = error.message;
            throw error;
        }

        return results;
    }

    /**
     * Execute steps sequentially with dependency management
     */
    async executeSequentialSteps(steps, toolMap, context) {
        const results = [];
        const stepContext = { ...context };

        for (const step of steps) {
            try {
                // Check if tool is available
                const tool = toolMap.get(step.toolName);
                if (!tool) {
                    if (step.required) {
                        throw new Error(`Required tool ${step.toolName} not available`);
                    }
                    results.push({
                        step: step.name,
                        tool: step.toolName,
                        status: 'skipped',
                        reason: 'Tool not available'
                    });
                    continue;
                }

                // Prepare tool parameters
                const parameters = await this.prepareToolParameters(step, stepContext, results);
                
                // Execute tool
                const toolResult = await this.executeToolWithRetry(tool, parameters, step.retries || 1);
                
                // Process result
                const processedResult = await this.processToolResult(toolResult, step, stepContext);
                results.push(processedResult);

                // Update context for next steps
                stepContext[step.outputKey] = processedResult.data;

            } catch (error) {
                const errorResult = {
                    step: step.name,
                    tool: step.toolName,
                    status: 'failed',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };

                results.push(errorResult);

                if (step.required) {
                    throw new Error(`Required step ${step.name} failed: ${error.message}`);
                }
            }
        }

        return results;
    }

    /**
     * Execute steps in parallel
     */
    async executeParallelSteps(steps, toolMap, context) {
        const promises = steps.map(async (step) => {
            try {
                const tool = toolMap.get(step.toolName);
                if (!tool) {
                    return {
                        step: step.name,
                        tool: step.toolName,
                        status: 'skipped',
                        reason: 'Tool not available'
                    };
                }

                const parameters = await this.prepareToolParameters(step, context, []);
                const toolResult = await this.executeToolWithRetry(tool, parameters, step.retries || 1);
                return await this.processToolResult(toolResult, step, context);

            } catch (error) {
                return {
                    step: step.name,
                    tool: step.toolName,
                    status: 'failed',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        return await Promise.all(promises);
    }

    /**
     * Execute tool with retry logic
     */
    async executeToolWithRetry(tool, parameters, maxRetries) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await tool.execute(parameters, { 
                    log: console, 
                    session: { roots: [] } 
                });
                
                return {
                    success: true,
                    result,
                    attempt,
                    timestamp: new Date().toISOString()
                };

            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        throw new Error(`Tool execution failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Prepare tool parameters based on step configuration and context
     */
    async prepareToolParameters(step, context, previousResults) {
        const parameters = { ...step.parameters };

        // Substitute context variables
        for (const [key, value] of Object.entries(parameters)) {
            if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
                const contextKey = value.slice(2, -1);
                parameters[key] = context[contextKey] || value;
            }
        }

        // Add dynamic parameters based on previous results
        if (step.dynamicParameters) {
            for (const [paramKey, sourceConfig] of Object.entries(step.dynamicParameters)) {
                const sourceResult = previousResults.find(r => r.step === sourceConfig.fromStep);
                if (sourceResult && sourceResult.data) {
                    parameters[paramKey] = sourceResult.data[sourceConfig.field] || sourceConfig.default;
                }
            }
        }

        return parameters;
    }

    /**
     * Process tool result and extract relevant data
     */
    async processToolResult(toolResult, step, context) {
        const processed = {
            step: step.name,
            tool: step.toolName,
            status: toolResult.success ? 'completed' : 'failed',
            timestamp: toolResult.timestamp,
            duration: Date.now() - new Date(toolResult.timestamp).getTime(),
            data: {},
            summary: ''
        };

        if (toolResult.success && toolResult.result) {
            // Extract data based on step configuration
            if (step.dataExtraction) {
                processed.data = this.extractDataFromResult(toolResult.result, step.dataExtraction);
            }

            // Generate summary
            processed.summary = await this.generateStepSummary(toolResult.result, step, context);
        } else {
            processed.error = toolResult.error || 'Unknown error';
        }

        return processed;
    }

    /**
     * Extract specific data from tool result
     */
    extractDataFromResult(result, extractionConfig) {
        const extracted = {};

        for (const [key, path] of Object.entries(extractionConfig)) {
            try {
                // Simple path extraction (e.g., "content.0.text")
                const pathParts = path.split('.');
                let value = result;
                
                for (const part of pathParts) {
                    if (value && typeof value === 'object') {
                        value = value[part];
                    } else {
                        value = undefined;
                        break;
                    }
                }
                
                extracted[key] = value;
            } catch (error) {
                extracted[key] = null;
            }
        }

        return extracted;
    }

    /**
     * Generate AI-powered step summary
     */
    async generateStepSummary(result, step, context) {
        try {
            const prompt = `Summarize the result of the ${step.name} step in 1-2 sentences:

Tool: ${step.toolName}
Result: ${JSON.stringify(result).substring(0, 500)}...

Provide a concise, actionable summary of what was accomplished.`;

            const aiResult = await generateTextService({
                prompt,
                outputType: 'mcp',
                commandName: 'workflow_orchestrator'
            });

            if (aiResult.success) {
                return aiResult.response;
            }
        } catch (error) {
            // Fallback to simple summary
        }

        return `${step.name} completed using ${step.toolName}`;
    }

    /**
     * Generate comprehensive workflow response
     */
    async generateWorkflowResponse(userInput, coordination, executionResults, context) {
        const successfulSteps = executionResults.filter(r => r.status === 'completed');
        const failedSteps = executionResults.filter(r => r.status === 'failed');
        const skippedSteps = executionResults.filter(r => r.status === 'skipped');

        let response = `# Workflow Execution Results\n\n`;
        response += `**Request**: ${userInput}\n`;
        response += `**Workflow Type**: ${coordination.intent.type}\n`;
        response += `**Execution Summary**: ${successfulSteps.length} completed, ${failedSteps.length} failed, ${skippedSteps.length} skipped\n\n`;

        // Add successful steps
        if (successfulSteps.length > 0) {
            response += `## ✅ Completed Steps\n\n`;
            successfulSteps.forEach((step, index) => {
                response += `${index + 1}. **${step.step}** (${step.tool})\n`;
                response += `   ${step.summary}\n`;
                if (step.duration) {
                    response += `   Duration: ${Math.round(step.duration / 1000)}s\n`;
                }
                response += '\n';
            });
        }

        // Add failed steps
        if (failedSteps.length > 0) {
            response += `## ❌ Failed Steps\n\n`;
            failedSteps.forEach((step, index) => {
                response += `${index + 1}. **${step.step}** (${step.tool})\n`;
                response += `   Error: ${step.error}\n\n`;
            });
        }

        // Add skipped steps
        if (skippedSteps.length > 0) {
            response += `## ⏭️ Skipped Steps\n\n`;
            skippedSteps.forEach((step, index) => {
                response += `${index + 1}. **${step.step}** - ${step.reason}\n`;
            });
            response += '\n';
        }

        // Generate context-aware response
        const contextResponse = await this.responseSystem.generateResponse(
            userInput,
            context,
            executionResults
        );

        if (contextResponse.response) {
            response += `## 💡 Analysis & Recommendations\n\n`;
            response += contextResponse.response;
        }

        return response;
    }

    /**
     * Generate workflow suggestions
     */
    generateWorkflowSuggestions(coordination, executionResults) {
        const suggestions = [];
        const successfulSteps = executionResults.filter(r => r.status === 'completed');
        const failedSteps = executionResults.filter(r => r.status === 'failed');

        // Success-based suggestions
        if (successfulSteps.length > 0) {
            suggestions.push('Review the completed steps for actionable insights');
            
            if (coordination.intent.type === 'discovery') {
                suggestions.push('Consider generating a PRD based on the research findings');
            } else if (coordination.intent.type === 'planning') {
                suggestions.push('Start a sprint with the prioritized tasks');
            }
        }

        // Failure-based suggestions
        if (failedSteps.length > 0) {
            suggestions.push('Retry failed steps individually for better error diagnosis');
            suggestions.push('Check tool availability and parameters');
        }

        // Workflow-specific suggestions
        switch (coordination.intent.type) {
            case 'discovery':
                suggestions.push('Continue with technical validation if not completed');
                break;
            case 'planning':
                suggestions.push('Generate burndown charts for sprint tracking');
                break;
            case 'collaboration':
                suggestions.push('Share results with team members');
                break;
        }

        return suggestions;
    }

    /**
     * Initialize workflow templates
     */
    initializeWorkflowTemplates() {
        return {
            discovery: {
                name: 'Project Discovery Workflow',
                description: 'Complete project discovery from research to PRD',
                steps: [
                    {
                        name: 'Initialize Discovery Session',
                        toolName: 'start_discovery_session',
                        required: true,
                        parameters: { projectName: '${projectName}' },
                        outputKey: 'sessionId'
                    },
                    {
                        name: 'Market Research',
                        toolName: 'research_market_opportunity',
                        required: false,
                        parameters: { includeCompetitors: true },
                        outputKey: 'marketResearch'
                    },
                    {
                        name: 'Technical Validation',
                        toolName: 'validate_technical_feasibility',
                        required: false,
                        parameters: { includeArchitecture: true },
                        outputKey: 'technicalValidation'
                    },
                    {
                        name: 'Requirements Synthesis',
                        toolName: 'synthesize_requirements',
                        required: true,
                        parameters: {},
                        outputKey: 'requirements'
                    },
                    {
                        name: 'PRD Generation',
                        toolName: 'generate_prd',
                        required: true,
                        parameters: {},
                        outputKey: 'prd'
                    },
                    {
                        name: 'Quality Assessment',
                        toolName: 'assess_prd_quality',
                        required: false,
                        parameters: {},
                        outputKey: 'qualityAssessment'
                    }
                ]
            },
            planning: {
                name: 'Sprint Planning Workflow',
                description: 'Complete sprint planning with prioritization',
                steps: [
                    {
                        name: 'Task Prioritization',
                        toolName: 'prioritize_tasks',
                        required: false,
                        parameters: { method: 'ai' },
                        outputKey: 'prioritizedTasks'
                    },
                    {
                        name: 'Sprint Creation',
                        toolName: 'manage_sprint',
                        required: true,
                        parameters: { action: 'create', sprintName: '${sprintName}' },
                        outputKey: 'sprint'
                    }
                ]
            },
            collaboration: {
                name: 'Team Collaboration Workflow',
                description: 'Generate reports and share knowledge',
                steps: [
                    {
                        name: 'Progress Summary',
                        toolName: 'generate_progress_summary',
                        required: false,
                        parameters: { summaryType: 'weekly' },
                        outputKey: 'progressSummary'
                    },
                    {
                        name: 'Handoff Report',
                        toolName: 'generate_handoff_report',
                        required: false,
                        parameters: { reportType: 'daily' },
                        outputKey: 'handoffReport'
                    }
                ]
            },
            default: {
                name: 'General Workflow',
                description: 'Basic workflow execution',
                steps: [
                    {
                        name: 'Get Work Context',
                        toolName: 'get_work_context',
                        required: true,
                        parameters: {},
                        outputKey: 'workContext'
                    }
                ]
            }
        };
    }

    /**
     * Customize workflow steps based on context
     */
    async customizeWorkflowSteps(templateSteps, context, intent) {
        // Clone template steps
        const customizedSteps = JSON.parse(JSON.stringify(templateSteps));

        // Apply context-specific customizations
        for (const step of customizedSteps) {
            // Customize parameters based on context
            if (context.projectType && step.parameters) {
                step.parameters.projectType = context.projectType;
            }
            
            if (context.audience && step.parameters) {
                step.parameters.audience = context.audience;
            }

            // Adjust requirements based on intent confidence
            if (intent.confidence < 0.7) {
                step.required = false;
            }
        }

        return customizedSteps;
    }

    /**
     * Estimate workflow duration
     */
    estimateWorkflowDuration(steps) {
        const stepDurations = {
            'start_discovery_session': 30,
            'research_market_opportunity': 120,
            'validate_technical_feasibility': 90,
            'synthesize_requirements': 60,
            'generate_prd': 180,
            'assess_prd_quality': 45,
            'prioritize_tasks': 60,
            'manage_sprint': 30,
            'generate_progress_summary': 45,
            'generate_handoff_report': 60,
            'get_work_context': 15
        };

        return steps.reduce((total, step) => {
            return total + (stepDurations[step.toolName] || 30);
        }, 0);
    }

    /**
     * Analyze step dependencies
     */
    analyzeDependencies(steps) {
        const dependencies = [];
        
        for (let i = 1; i < steps.length; i++) {
            const currentStep = steps[i];
            const previousStep = steps[i - 1];
            
            if (currentStep.dynamicParameters) {
                dependencies.push({
                    step: currentStep.name,
                    dependsOn: previousStep.name,
                    type: 'data'
                });
            }
        }
        
        return dependencies;
    }

    /**
     * Get workflow status
     */
    getWorkflowStatus(workflowId) {
        return this.activeWorkflows.get(workflowId);
    }

    /**
     * List active workflows
     */
    listActiveWorkflows() {
        return Array.from(this.activeWorkflows.values());
    }

    /**
     * Clear completed workflows
     */
    clearCompletedWorkflows() {
        for (const [id, workflow] of this.activeWorkflows.entries()) {
            if (workflow.status === 'completed' || workflow.status === 'failed') {
                this.activeWorkflows.delete(id);
            }
        }
    }
}
