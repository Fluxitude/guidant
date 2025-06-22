/**
 * tools/discovery/research-market-opportunity.js
 * MCP tool for market research using ResearchRouter with intelligent provider selection
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	getProjectRootFromSession
} from '../utils.js';
import { DiscoverySessionManager } from '../../core/discovery/discovery-session-manager.js';
import { ResearchRouter } from '../../core/discovery/research-router.js';
import { initializeResearchRouter } from './research-router-factory.js';
import {
	DISCOVERY_STAGES,
	DISCOVERY_SESSION_STATUS,
	DISCOVERY_MESSAGES,
	DISCOVERY_ERROR_CODES,
	RESEARCH_PROVIDERS
} from '../../core/discovery/constants.js';

/**
 * Register the research-market-opportunity tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerResearchMarketOpportunityTool(server) {
	server.addTool({
		name: 'research_market_opportunity',
		description: 'Conduct market research and competitive analysis using intelligent provider routing',
		parameters: z.object({
			sessionId: z
				.string()
				.uuid()
				.describe('Discovery session ID'),
			researchQueries: z
				.array(z.string())
				.min(1)
				.max(5)
				.describe('Market research queries (1-5 queries)'),
			targetMarket: z
				.string()
				.optional()
				.describe('Target market or industry segment'),
			competitors: z
				.array(z.string())
				.optional()
				.describe('Known competitors or similar products'),
			researchFocus: z
				.enum(['market_size', 'competitive_analysis', 'user_needs', 'pricing', 'trends'])
				.optional()
				.describe('Primary research focus area'),
			projectRoot: z
				.string()
				.optional()
				.describe('Absolute path to the project root directory (Optional, usually from session)')
		}),
		execute: async (args, { log, session }) => {
			const { 
				sessionId, 
				researchQueries, 
				targetMarket, 
				competitors = [], 
				researchFocus = 'market_size' 
			} = args;

			try {
				// Get project root from session or args
				const projectRoot = getProjectRootFromSession(session, log);
				
				log.info(`Conducting market research for session: ${sessionId} in root: ${projectRoot}`);

				// Initialize managers
				const sessionManager = new DiscoverySessionManager(projectRoot);
				const researchRouter = await initializeResearchRouter();

				// Load current session
				const currentSession = await sessionManager.getSession(sessionId);
				if (!currentSession) {
					return createErrorResponse(`Discovery session ${sessionId} not found`);
				}

				// Validate session is in appropriate stage
				if (currentSession.stage !== DISCOVERY_STAGES.PROBLEM_DISCOVERY && 
					currentSession.stage !== DISCOVERY_STAGES.MARKET_RESEARCH) {
					return createErrorResponse(
						`Market research can only be conducted during Problem Discovery or Market Research stages. Current stage: ${currentSession.stage}`
					);
				}

				// Prepare research context
				const researchContext = {
					stage: DISCOVERY_STAGES.MARKET_RESEARCH,
					projectType: currentSession.projectName,
					targetMarket,
					competitors,
					focus: researchFocus,
					features: currentSession.metadata?.userPreferences?.businessGoals || [],
					apiKey: process.env.TAVILY_API_KEY // Primary provider for market research
				};

				// Execute research queries using ResearchRouter
				const researchResults = [];
				for (const query of researchQueries) {
					try {
						log.info(`Executing market research query: ${query}`);
						
						const result = await researchRouter.routeQuery(query, researchContext);
						researchResults.push({
							query,
							provider: result.provider,
							queryType: result.queryType,
							results: result.results,
							metadata: result.metadata
						});

						// Add research data to session
						await sessionManager.addResearchData(sessionId, 'marketAnalysis', {
							query,
							provider: result.provider,
							results: result.results,
							focus: researchFocus,
							targetMarket,
							competitors
						});

					} catch (error) {
						log.error(`Market research query failed: ${query} - ${error.message}`);
						researchResults.push({
							query,
							error: error.message,
							timestamp: new Date().toISOString()
						});
					}
				}

				// Update session progress
				const progressUpdate = {
					completionScore: Math.min(100, (researchResults.length / researchQueries.length) * 100),
					lastActivity: new Date().toISOString(),
					researchQueriesCompleted: researchResults.filter(r => !r.error).length,
					totalQueries: researchQueries.length
				};

				await sessionManager.updateStageProgress(
					sessionId, 
					DISCOVERY_STAGES.MARKET_RESEARCH, 
					progressUpdate
				);

				// Advance to market research stage if still in problem discovery
				if (currentSession.stage === DISCOVERY_STAGES.PROBLEM_DISCOVERY) {
					await sessionManager.advanceStage(sessionId);
				}

				// Format response data
				const responseData = {
					sessionId,
					stage: DISCOVERY_STAGES.MARKET_RESEARCH,
					researchResults,
					summary: {
						totalQueries: researchQueries.length,
						successfulQueries: researchResults.filter(r => !r.error).length,
						failedQueries: researchResults.filter(r => r.error).length,
						primaryProvider: researchResults[0]?.provider || 'unknown',
						researchFocus,
						targetMarket,
						competitors
					},
					nextSteps: [
						'Review market research findings for key insights',
						'Identify market gaps and opportunities',
						'Validate technical feasibility using validate-technical-feasibility tool',
						'Consider competitive positioning and differentiation'
					],
					availableTools: [
						'validate-technical-feasibility',
						'synthesize-requirements'
					]
				};

				return handleApiResult(
					{ success: true, data: responseData },
					log,
					'Error conducting market research',
					null,
					projectRoot
				);

			} catch (error) {
				log.error(`Error in research-market-opportunity tool: ${error.message}\n${error.stack}`);
				
				// Handle specific error cases
				if (error.message.includes(DISCOVERY_ERROR_CODES.SESSION_NOT_FOUND)) {
					return createErrorResponse(
						`Discovery session ${sessionId} not found. Use start-discovery-session to create a new session.`
					);
				}
				
				return createErrorResponse(`Failed to conduct market research: ${error.message}`);
			}
		}
	});
}
