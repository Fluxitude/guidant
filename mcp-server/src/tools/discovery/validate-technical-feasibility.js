/**
 * tools/discovery/validate-technical-feasibility.js
 * MCP tool for technical feasibility validation using Context7 and research providers
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
 * Register the validate-technical-feasibility tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerValidateTechnicalFeasibilityTool(server) {
	server.addTool({
		name: 'validate_technical_feasibility',
		description: 'Validate technical feasibility using Context7 for library documentation and architecture recommendations',
		parameters: z.object({
			sessionId: z
				.string()
				.uuid()
				.describe('Discovery session ID'),
			technologies: z
				.array(z.string())
				.min(1)
				.max(10)
				.describe('Technologies to validate (e.g., ["React", "Node.js", "PostgreSQL"])'),
			projectType: z
				.string()
				.describe('Type of project (e.g., "web application", "mobile app", "API service")'),
			features: z
				.array(z.string())
				.optional()
				.describe('Key features to validate technical feasibility for'),
			scale: z
				.enum(['small', 'medium', 'large', 'enterprise'])
				.optional()
				.default('medium')
				.describe('Expected project scale'),
			constraints: z
				.array(z.string())
				.optional()
				.describe('Technical constraints (e.g., ["Must support offline mode", "Real-time updates required"])'),
			projectRoot: z
				.string()
				.optional()
				.describe('Absolute path to the project root directory (Optional, usually from session)')
		}),
		execute: async (args, { log, session }) => {
			const { 
				sessionId, 
				technologies, 
				projectType, 
				features = [], 
				scale = 'medium',
				constraints = []
			} = args;

			try {
				// Get project root from session or args
				const projectRoot = getProjectRootFromSession(session, log);
				
				log.info(`Validating technical feasibility for session: ${sessionId} in root: ${projectRoot}`);

				// Initialize managers
				const sessionManager = new DiscoverySessionManager(projectRoot);
				const researchRouter = await initializeResearchRouter();

				// Load current session
				const currentSession = await sessionManager.getSession(sessionId);
				if (!currentSession) {
					return createErrorResponse(`Discovery session ${sessionId} not found`);
				}

				// Validate session is in appropriate stage
				if (currentSession.stage !== DISCOVERY_STAGES.MARKET_RESEARCH && 
					currentSession.stage !== DISCOVERY_STAGES.TECHNICAL_FEASIBILITY) {
					return createErrorResponse(
						`Technical feasibility validation can only be conducted during Market Research or Technical Feasibility stages. Current stage: ${currentSession.stage}`
					);
				}

				// Prepare technical validation context
				const validationContext = {
					stage: DISCOVERY_STAGES.TECHNICAL_FEASIBILITY,
					projectType,
					technologies,
					features,
					scale,
					constraints,
					focus: 'technical'
				};

				// Execute technical feasibility validation
				const validationResults = [];

				// 1. Validate each technology using Context7
				for (const tech of technologies) {
					try {
						log.info(`Validating technology: ${tech}`);
						
						const techQuery = `${tech} documentation and best practices for ${projectType}`;
						const result = await researchRouter.routeQuery(techQuery, validationContext);
						
						validationResults.push({
							technology: tech,
							provider: result.provider,
							queryType: result.queryType,
							validation: result.results,
							metadata: result.metadata
						});

						// Add technical validation data to session
						await sessionManager.addResearchData(sessionId, 'technicalValidation', {
							technology: tech,
							provider: result.provider,
							validation: result.results,
							projectType,
							scale,
							constraints
						});

					} catch (error) {
						log.error(`Technology validation failed: ${tech} - ${error.message}`);
						validationResults.push({
							technology: tech,
							error: error.message,
							timestamp: new Date().toISOString()
						});
					}
				}

				// 2. Get architecture recommendations
				let architectureRecommendations = null;
				try {
					const archQuery = `Architecture recommendations for ${projectType} using ${technologies.join(', ')}`;
					const archResult = await researchRouter.routeQuery(archQuery, {
						...validationContext,
						focus: 'architecture'
					});
					
					architectureRecommendations = {
						provider: archResult.provider,
						recommendations: archResult.results,
						metadata: archResult.metadata
					};

					// Add architecture data to session
					await sessionManager.addResearchData(sessionId, 'technicalValidation', {
						type: 'architecture',
						provider: archResult.provider,
						recommendations: archResult.results,
						technologies,
						projectType,
						scale
					});

				} catch (error) {
					log.error(`Architecture recommendations failed: ${error.message}`);
					architectureRecommendations = {
						error: error.message,
						timestamp: new Date().toISOString()
					};
				}

				// Update session progress
				const successfulValidations = validationResults.filter(r => !r.error).length;
				const progressUpdate = {
					completionScore: Math.min(100, (successfulValidations / technologies.length) * 100),
					lastActivity: new Date().toISOString(),
					technologiesValidated: successfulValidations,
					totalTechnologies: technologies.length,
					architectureValidated: !architectureRecommendations?.error
				};

				await sessionManager.updateStageProgress(
					sessionId, 
					DISCOVERY_STAGES.TECHNICAL_FEASIBILITY, 
					progressUpdate
				);

				// Advance to technical feasibility stage if still in market research
				if (currentSession.stage === DISCOVERY_STAGES.MARKET_RESEARCH) {
					await sessionManager.advanceStage(sessionId);
				}

				// Format response data
				const responseData = {
					sessionId,
					stage: DISCOVERY_STAGES.TECHNICAL_FEASIBILITY,
					validationResults,
					architectureRecommendations,
					summary: {
						totalTechnologies: technologies.length,
						validatedTechnologies: successfulValidations,
						failedValidations: validationResults.filter(r => r.error).length,
						primaryProvider: validationResults[0]?.provider || 'unknown',
						projectType,
						scale,
						constraints
					},
					feasibilityAssessment: {
						overallFeasibility: successfulValidations >= technologies.length * 0.8 ? 'HIGH' : 
										   successfulValidations >= technologies.length * 0.6 ? 'MEDIUM' : 'LOW',
						riskFactors: validationResults.filter(r => r.error).map(r => r.technology),
						recommendedApproach: architectureRecommendations?.recommendations || 'Architecture analysis pending'
					},
					nextSteps: [
						'Review technical validation results and architecture recommendations',
						'Address any identified risk factors or technology concerns',
						'Proceed to requirements synthesis using synthesize-requirements tool',
						'Consider alternative technologies for any failed validations'
					],
					availableTools: [
						'synthesize-requirements',
						'research-market-opportunity'
					]
				};

				return handleApiResult(
					{ success: true, data: responseData },
					log,
					'Error validating technical feasibility',
					null,
					projectRoot
				);

			} catch (error) {
				log.error(`Error in validate-technical-feasibility tool: ${error.message}\n${error.stack}`);
				
				// Handle specific error cases
				if (error.message.includes(DISCOVERY_ERROR_CODES.SESSION_NOT_FOUND)) {
					return createErrorResponse(
						`Discovery session ${sessionId} not found. Use start-discovery-session to create a new session.`
					);
				}
				
				return createErrorResponse(`Failed to validate technical feasibility: ${error.message}`);
			}
		}
	});
}
