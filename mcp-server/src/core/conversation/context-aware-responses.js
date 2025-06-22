/**
 * core/conversation/context-aware-responses.js
 * Context-aware response system with research integration
 */

import { ResearchRouter } from '../research/research-router.js';
import { callAiService } from '../../../scripts/modules/ai-services-unified.js';

/**
 * Context-Aware Response System
 */
export class ContextAwareResponseSystem {
    constructor() {
        this.researchRouter = new ResearchRouter();
        this.contextCache = new Map();
        this.responsePatterns = this.initializeResponsePatterns();
    }

    /**
     * Generate context-aware response with research integration
     */
    async generateResponse(userInput, conversationContext, toolResults = []) {
        try {
            // Analyze if research is needed
            const researchNeeds = await this.analyzeResearchNeeds(userInput, conversationContext);
            
            // Conduct research if needed
            let researchResults = [];
            if (researchNeeds.shouldResearch) {
                researchResults = await this.conductContextualResearch(researchNeeds, conversationContext);
            }

            // Generate enhanced response
            const response = await this.generateEnhancedResponse(
                userInput,
                conversationContext,
                toolResults,
                researchResults
            );

            return {
                response,
                researchConducted: researchNeeds.shouldResearch,
                researchResults,
                contextUsed: this.extractUsedContext(conversationContext),
                suggestions: this.generateContextualSuggestions(conversationContext, researchResults)
            };

        } catch (error) {
            console.error('Context-aware response generation failed:', error);
            return {
                response: this.generateFallbackResponse(userInput, conversationContext),
                researchConducted: false,
                researchResults: [],
                contextUsed: {},
                suggestions: ['Try rephrasing your question or being more specific']
            };
        }
    }

    /**
     * Analyze if research is needed for the response
     */
    async analyzeResearchNeeds(userInput, context) {
        const researchTriggers = {
            technical: [
                'how to', 'best practices', 'documentation', 'api', 'library', 'framework',
                'implementation', 'code example', 'tutorial', 'guide', 'reference'
            ],
            market: [
                'market', 'competition', 'trends', 'industry', 'analysis', 'research',
                'opportunity', 'landscape', 'benchmarking', 'comparison'
            ],
            validation: [
                'feasible', 'possible', 'validate', 'check', 'verify', 'confirm',
                'technical feasibility', 'architecture', 'scalability'
            ]
        };

        const input = userInput.toLowerCase();
        let shouldResearch = false;
        let researchType = 'general';
        let queries = [];

        // Check for technical research triggers
        if (researchTriggers.technical.some(trigger => input.includes(trigger))) {
            shouldResearch = true;
            researchType = 'technical';
            queries = this.extractTechnicalQueries(userInput, context);
        }
        // Check for market research triggers
        else if (researchTriggers.market.some(trigger => input.includes(trigger))) {
            shouldResearch = true;
            researchType = 'market';
            queries = this.extractMarketQueries(userInput, context);
        }
        // Check for validation triggers
        else if (researchTriggers.validation.some(trigger => input.includes(trigger))) {
            shouldResearch = true;
            researchType = 'validation';
            queries = this.extractValidationQueries(userInput, context);
        }

        // Context-based research triggers
        if (!shouldResearch && context.projectPhase === 'discovery') {
            shouldResearch = true;
            researchType = 'discovery';
            queries = [`${context.projectName || 'project'} requirements and best practices`];
        }

        return {
            shouldResearch,
            researchType,
            queries,
            confidence: shouldResearch ? 0.8 : 0.2
        };
    }

    /**
     * Conduct contextual research
     */
    async conductContextualResearch(researchNeeds, context) {
        const results = [];

        for (const query of researchNeeds.queries) {
            try {
                const researchResult = await this.researchRouter.routeQuery(query, {
                    projectType: context.projectType || 'general',
                    audience: context.audience || 'technical',
                    researchType: researchNeeds.researchType
                });

                results.push({
                    query,
                    provider: researchResult.provider,
                    content: researchResult.content,
                    confidence: researchResult.confidence || 0.7,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error(`Research failed for query: ${query}`, error);
                results.push({
                    query,
                    provider: 'error',
                    content: `Research failed: ${error.message}`,
                    confidence: 0,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return results;
    }

    /**
     * Generate enhanced response with research integration
     */
    async generateEnhancedResponse(userInput, context, toolResults, researchResults) {
        const prompt = this.buildResponsePrompt(userInput, context, toolResults, researchResults);

        try {
            const result = await callAiService({
                prompt,
                outputType: 'mcp',
                commandName: 'context_aware_response'
            });

            if (result.success) {
                return this.enhanceResponseWithContext(result.response, context, researchResults);
            }
        } catch (error) {
            console.error('AI response generation failed:', error);
        }

        return this.generateTemplateResponse(userInput, context, toolResults, researchResults);
    }

    /**
     * Build comprehensive prompt for AI response generation
     */
    buildResponsePrompt(userInput, context, toolResults, researchResults) {
        let prompt = `Generate a helpful, context-aware response to the user's input: "${userInput}"\n\n`;

        // Add conversation context
        if (context.projectName) {
            prompt += `Project Context: ${context.projectName}\n`;
        }
        if (context.projectPhase) {
            prompt += `Project Phase: ${context.projectPhase}\n`;
        }
        if (context.workflowState) {
            prompt += `Current Workflow: ${context.workflowState}\n`;
        }

        // Add tool results
        if (toolResults.length > 0) {
            prompt += `\nTool Results:\n`;
            toolResults.forEach((result, index) => {
                prompt += `${index + 1}. ${result.tool}: ${result.summary || 'Completed successfully'}\n`;
            });
        }

        // Add research results
        if (researchResults.length > 0) {
            prompt += `\nResearch Findings:\n`;
            researchResults.forEach((research, index) => {
                prompt += `${index + 1}. ${research.query} (${research.provider}):\n`;
                prompt += `   ${research.content.substring(0, 200)}...\n`;
            });
        }

        prompt += `\nPlease provide a comprehensive response that:
1. Directly addresses the user's question or request
2. Incorporates relevant context and research findings
3. Provides actionable next steps or recommendations
4. Maintains a helpful and professional tone
5. Suggests follow-up actions if appropriate

Format the response in markdown with clear sections.`;

        return prompt;
    }

    /**
     * Enhance response with additional context
     */
    enhanceResponseWithContext(baseResponse, context, researchResults) {
        let enhancedResponse = baseResponse;

        // Add research citations if available
        if (researchResults.length > 0) {
            enhancedResponse += '\n\n## 📚 Research Sources\n\n';
            researchResults.forEach((research, index) => {
                enhancedResponse += `${index + 1}. **${research.query}** (via ${research.provider})\n`;
            });
        }

        // Add contextual recommendations
        if (context.projectPhase) {
            enhancedResponse += this.getPhaseSpecificRecommendations(context.projectPhase);
        }

        return enhancedResponse;
    }

    /**
     * Generate template response as fallback
     */
    generateTemplateResponse(userInput, context, toolResults, researchResults) {
        let response = `## Response to: "${userInput}"\n\n`;

        // Add context summary
        if (context.projectName) {
            response += `**Project**: ${context.projectName}\n`;
        }
        if (context.projectPhase) {
            response += `**Phase**: ${context.projectPhase}\n`;
        }

        response += '\n';

        // Add tool results summary
        if (toolResults.length > 0) {
            response += `## 🔧 Tool Results\n\n`;
            toolResults.forEach(result => {
                response += `- **${result.tool}**: ${result.summary || 'Completed'}\n`;
            });
            response += '\n';
        }

        // Add research summary
        if (researchResults.length > 0) {
            response += `## 📊 Research Findings\n\n`;
            researchResults.forEach(research => {
                response += `- **${research.query}**: Research conducted via ${research.provider}\n`;
            });
            response += '\n';
        }

        // Add generic recommendations
        response += `## 💡 Recommendations\n\n`;
        response += `- Review the results above for relevant information\n`;
        response += `- Consider using specific Task Master tools for detailed assistance\n`;
        response += `- Ask follow-up questions for more targeted help\n`;

        return response;
    }

    /**
     * Extract technical queries from user input
     */
    extractTechnicalQueries(userInput, context) {
        const queries = [];
        const input = userInput.toLowerCase();

        // Extract technology mentions
        const techKeywords = ['react', 'vue', 'angular', 'node', 'python', 'javascript', 'typescript'];
        const mentionedTech = techKeywords.filter(tech => input.includes(tech));

        if (mentionedTech.length > 0) {
            queries.push(`${mentionedTech[0]} best practices and documentation`);
        }

        // Extract specific technical questions
        if (input.includes('how to')) {
            const howToMatch = input.match(/how to (.+?)(?:\?|$)/);
            if (howToMatch) {
                queries.push(`${howToMatch[1]} implementation guide`);
            }
        }

        // Default technical query
        if (queries.length === 0) {
            queries.push(`${context.projectType || 'web development'} technical documentation`);
        }

        return queries;
    }

    /**
     * Extract market queries from user input
     */
    extractMarketQueries(userInput, context) {
        const queries = [];
        
        if (context.projectName) {
            queries.push(`${context.projectName} market analysis and competition`);
        }
        
        queries.push('market trends and opportunities');
        
        return queries;
    }

    /**
     * Extract validation queries from user input
     */
    extractValidationQueries(userInput, context) {
        const queries = [];
        
        if (context.projectType) {
            queries.push(`${context.projectType} technical feasibility and architecture`);
        }
        
        queries.push('technical validation and best practices');
        
        return queries;
    }

    /**
     * Generate contextual suggestions
     */
    generateContextualSuggestions(context, researchResults) {
        const suggestions = [];

        // Phase-based suggestions
        switch (context.projectPhase) {
            case 'discovery':
                suggestions.push('Continue with market research and technical validation');
                suggestions.push('Generate a comprehensive PRD when ready');
                break;
            case 'planning':
                suggestions.push('Prioritize tasks based on business value');
                suggestions.push('Create sprint plans with realistic timelines');
                break;
            case 'development':
                suggestions.push('Track progress with work context tools');
                suggestions.push('Document technical decisions for the team');
                break;
        }

        // Research-based suggestions
        if (researchResults.length > 0) {
            suggestions.push('Review research findings for implementation guidance');
            suggestions.push('Validate technical approaches with Context7 documentation');
        }

        return suggestions;
    }

    /**
     * Get phase-specific recommendations
     */
    getPhaseSpecificRecommendations(phase) {
        const recommendations = {
            discovery: '\n\n## 🔍 Discovery Phase Recommendations\n\n- Conduct thorough market research\n- Validate technical feasibility\n- Define clear requirements\n',
            planning: '\n\n## 📋 Planning Phase Recommendations\n\n- Prioritize features by business value\n- Create realistic sprint goals\n- Estimate effort accurately\n',
            development: '\n\n## 💻 Development Phase Recommendations\n\n- Maintain clear documentation\n- Track progress regularly\n- Communicate with stakeholders\n'
        };

        return recommendations[phase] || '';
    }

    /**
     * Extract used context for reporting
     */
    extractUsedContext(context) {
        return {
            projectName: context.projectName,
            projectPhase: context.projectPhase,
            workflowState: context.workflowState,
            audience: context.audience
        };
    }

    /**
     * Initialize response patterns
     */
    initializeResponsePatterns() {
        return {
            greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
            help: ['help', 'assist', 'support', 'guide', 'how'],
            status: ['status', 'progress', 'update', 'current', 'where'],
            planning: ['plan', 'organize', 'schedule', 'prioritize', 'sprint'],
            research: ['research', 'find', 'look up', 'investigate', 'analyze']
        };
    }

    /**
     * Generate fallback response
     */
    generateFallbackResponse(userInput, context) {
        return `I understand you're asking about: "${userInput}"\n\n` +
               `Based on your current context (${context.projectPhase || 'general workflow'}), ` +
               `I recommend using specific Task Master tools for detailed assistance.\n\n` +
               `Try asking more specific questions or use commands like:\n` +
               `- "What was I working on?" for context\n` +
               `- "Start discovery session" for new projects\n` +
               `- "Generate progress summary" for status updates`;
    }
}
