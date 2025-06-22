/**
 * tools/discovery/generate-prd.js
 * MCP tool for PRD generation using discovery session data and structured templates
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	getProjectRootFromSession
} from '../utils.js';
import { DiscoverySessionManager } from '../../core/discovery/discovery-session-manager.js';
import { PRDGenerator } from '../../core/discovery/prd-generator.js';
import {
	DISCOVERY_STAGES,
	DISCOVERY_SESSION_STATUS,
	DISCOVERY_MESSAGES,
	DISCOVERY_ERROR_CODES,
	PRD_QUALITY_THRESHOLDS
} from '../../core/discovery/constants.js';

/**
 * Register the generate-prd tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerGeneratePRDTool(server) {
	server.addTool({
		name: 'generate_prd',
		description: 'Generate a comprehensive Product Requirements Document from discovery session data',
		parameters: z.object({
			sessionId: z
				.string()
				.uuid()
				.describe('Discovery session ID'),
			templateType: z
				.enum(['COMPREHENSIVE', 'MINIMAL', 'TECHNICAL_FOCUSED'])
				.optional()
				.describe('PRD template type (auto-selected if not specified)'),
			outputPath: z
				.string()
				.optional()
				.describe('Output directory path for saving PRD file'),
			includeResearchData: z
				.boolean()
				.optional()
				.default(true)
				.describe('Include research data appendix in PRD'),
			customSections: z
				.array(z.object({
					title: z.string(),
					content: z.string(),
					order: z.number().int().positive()
				}))
				.optional()
				.describe('Additional custom sections to include'),
			aiEnhancement: z
				.boolean()
				.optional()
				.default(true)
				.describe('Use AI to enhance content quality and completeness'),
			projectRoot: z
				.string()
				.optional()
				.describe('Absolute path to the project root directory (Optional, usually from session)')
		}),
		execute: async (args, { log, session }) => {
			const { 
				sessionId, 
				templateType, 
				outputPath,
				includeResearchData = true,
				customSections = [],
				aiEnhancement = true
			} = args;

			try {
				// Get project root from session or args
				const projectRoot = getProjectRootFromSession(session, log);
				
				log.info(`Generating PRD for session: ${sessionId} in root: ${projectRoot}`);

				// Initialize managers
				const sessionManager = new DiscoverySessionManager(projectRoot);
				const prdGenerator = new PRDGenerator();

				// Load discovery session
				const discoverySession = await sessionManager.getSession(sessionId);
				if (!discoverySession) {
					return createErrorResponse(`Discovery session ${sessionId} not found`);
				}

				// Validate session is ready for PRD generation
				const validationResult = this.validateSessionReadiness(discoverySession);
				if (!validationResult.ready) {
					return createErrorResponse(validationResult.message);
				}

				// Determine output path
				const finalOutputPath = outputPath || `${projectRoot}/.taskmaster/docs`;

				// Generate PRD
				log.info('Generating PRD content using discovery session data...');
				const generationResult = await prdGenerator.generatePRD(discoverySession, {
					templateType,
					outputPath: finalOutputPath,
					includeResearchData,
					customSections,
					aiEnhancement
				});

				if (!generationResult.success) {
					log.error(`PRD generation failed: ${generationResult.error.message}`);
					return createErrorResponse(generationResult.error.message);
				}

				// Update discovery session with PRD data
				const prdData = {
					prdContent: generationResult.prd.content,
					qualityAssessment: generationResult.qualityAssessment,
					prdFilePath: generationResult.prd.metadata.filePath,
					generatedAt: generationResult.prd.metadata.generatedAt
				};

				await sessionManager.updateStageProgress(
					sessionId,
					DISCOVERY_STAGES.PRD_GENERATION,
					{
						completionScore: 100,
						lastActivity: new Date().toISOString(),
						prdGenerated: true,
						qualityScore: generationResult.qualityAssessment.overallScore,
						data: prdData
					}
				);

				// Advance to PRD generation stage if not already there
				if (discoverySession.stage !== DISCOVERY_STAGES.PRD_GENERATION) {
					await sessionManager.advanceStage(sessionId);
				}

				// Mark session as completed if PRD quality is acceptable
				if (generationResult.qualityAssessment.overallScore >= PRD_QUALITY_THRESHOLDS.ACCEPTABLE) {
					await sessionManager.completeSession(sessionId);
				}

				// Format response data
				const responseData = {
					sessionId,
					stage: DISCOVERY_STAGES.PRD_GENERATION,
					prd: {
						content: generationResult.prd.content,
						metadata: generationResult.prd.metadata,
						structure: generationResult.prd.structure
					},
					qualityAssessment: generationResult.qualityAssessment,
					summary: {
						templateUsed: generationResult.prd.metadata.template,
						wordCount: generationResult.qualityAssessment.assessmentDetails.wordCount,
						sectionCount: generationResult.qualityAssessment.assessmentDetails.sectionCount,
						requirementsCount: generationResult.qualityAssessment.assessmentDetails.requirementsCount,
						qualityScore: generationResult.qualityAssessment.overallScore,
						qualityLevel: generationResult.qualityAssessment.qualityLevel,
						filePath: generationResult.prd.metadata.filePath
					},
					readinessAssessment: {
						readyForDevelopment: generationResult.qualityAssessment.readinessMetrics.readyForDevelopment,
						readyForTaskGeneration: generationResult.qualityAssessment.readinessMetrics.readyForTaskGeneration,
						confidenceLevel: generationResult.qualityAssessment.readinessMetrics.confidenceLevel,
						priorityAreas: generationResult.qualityAssessment.readinessMetrics.priorityAreas
					},
					recommendations: generationResult.recommendations,
					nextSteps: this.generateNextSteps(generationResult.qualityAssessment, discoverySession)
				};

				return handleApiResult(
					{ success: true, data: responseData },
					log,
					'Error generating PRD',
					null,
					projectRoot
				);

			} catch (error) {
				log.error(`Error in generate-prd tool: ${error.message}\n${error.stack}`);
				
				// Handle specific error cases
				if (error.message.includes(DISCOVERY_ERROR_CODES.SESSION_NOT_FOUND)) {
					return createErrorResponse(
						`Discovery session ${sessionId} not found. Use start-discovery-session to create a new session.`
					);
				}
				
				return createErrorResponse(`Failed to generate PRD: ${error.message}`);
			}
		}
	});

	/**
	 * Validate if discovery session is ready for PRD generation
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {Object} Validation result
	 */
	function validateSessionReadiness(discoverySession) {
		// Check if requirements synthesis is completed
		const reqSynthesis = discoverySession.progress?.[DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS];
		if (!reqSynthesis || reqSynthesis.status !== 'completed') {
			return {
				ready: false,
				message: 'Requirements synthesis must be completed before PRD generation. Use synthesize-requirements tool first.'
			};
		}

		// Check if minimum requirements are met
		const reqData = reqSynthesis.data;
		if (!reqData?.functionalRequirements || reqData.functionalRequirements.length < 3) {
			return {
				ready: false,
				message: 'Minimum 3 functional requirements required for PRD generation. Add more requirements using synthesize-requirements tool.'
			};
		}

		// Check if session has sufficient discovery data
		const hasMarketData = discoverySession.progress?.[DISCOVERY_STAGES.MARKET_RESEARCH]?.completionScore > 0;
		const hasTechnicalData = discoverySession.progress?.[DISCOVERY_STAGES.TECHNICAL_FEASIBILITY]?.completionScore > 0;
		
		if (!hasMarketData && !hasTechnicalData) {
			return {
				ready: false,
				message: 'Insufficient discovery data. Complete market research and technical feasibility validation first.'
			};
		}

		return { ready: true };
	}

	/**
	 * Generate next steps based on PRD quality assessment
	 * @param {Object} qualityAssessment - Quality assessment results
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {Array} Next steps
	 */
	function generateNextSteps(qualityAssessment, discoverySession) {
		const nextSteps = [];

		if (qualityAssessment.overallScore >= PRD_QUALITY_THRESHOLDS.GOOD) {
			nextSteps.push(
				'PRD generation complete with good quality score',
				'Ready for stakeholder review and approval',
				'Proceed to task generation using parse-prd tool',
				'Consider setting up development environment'
			);
		} else if (qualityAssessment.overallScore >= PRD_QUALITY_THRESHOLDS.ACCEPTABLE) {
			nextSteps.push(
				'PRD generated with acceptable quality',
				'Review and address quality recommendations',
				'Consider additional discovery research if needed',
				'Ready for task generation with minor improvements'
			);
		} else {
			nextSteps.push(
				'PRD quality below recommended threshold',
				'Address identified gaps using assess-prd-quality tool',
				'Conduct additional discovery research',
				'Re-generate PRD after improvements'
			);
		}

		// Add specific recommendations based on gaps
		if (qualityAssessment.gaps.length > 0) {
			nextSteps.push(`Priority improvements: ${qualityAssessment.gaps.slice(0, 2).join(', ')}`);
		}

		return nextSteps;
	}
}
