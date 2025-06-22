/**
 * tools/discovery/synthesize-requirements.js
 * MCP tool to synthesize discovery findings into structured requirements
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	getProjectRootFromSession
} from '../utils.js';
import { DiscoverySessionManager } from '../../core/discovery/discovery-session-manager.js';
import {
	DISCOVERY_STAGES,
	DISCOVERY_SESSION_STATUS,
	DISCOVERY_MESSAGES,
	DISCOVERY_ERROR_CODES,
	DISCOVERY_DEFAULTS
} from '../../core/discovery/constants.js';

/**
 * Register the synthesize-requirements tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerSynthesizeRequirementsTool(server) {
	server.addTool({
		name: 'synthesize_requirements',
		description: 'Synthesize discovery findings into structured functional and non-functional requirements',
		parameters: z.object({
			sessionId: z
				.string()
				.uuid()
				.describe('Discovery session ID'),
			problemStatement: z
				.string()
				.min(10)
				.max(1000)
				.describe('Clear problem statement based on discovery findings'),
			targetUsers: z
				.array(z.string())
				.min(1)
				.describe('Target user groups identified during discovery'),
			successCriteria: z
				.array(z.string())
				.min(1)
				.describe('Success criteria and key metrics for the project'),
			functionalRequirements: z
				.array(z.object({
					id: z.string().describe('Requirement ID (e.g., FR-001)'),
					title: z.string().describe('Requirement title'),
					description: z.string().describe('Detailed requirement description'),
					priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Requirement priority'),
					userStory: z.string().optional().describe('User story format (As a... I want... So that...)')
				}))
				.min(3)
				.max(20)
				.describe('Functional requirements (3-20 requirements)'),
			nonFunctionalRequirements: z
				.array(z.object({
					id: z.string().describe('Requirement ID (e.g., NFR-001)'),
					category: z.enum(['Performance', 'Security', 'Usability', 'Reliability', 'Scalability', 'Maintainability']).describe('NFR category'),
					description: z.string().describe('Detailed requirement description'),
					priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Requirement priority'),
					acceptanceCriteria: z.string().optional().describe('Measurable acceptance criteria')
				}))
				.optional()
				.describe('Non-functional requirements'),
			projectRoot: z
				.string()
				.optional()
				.describe('Absolute path to the project root directory (Optional, usually from session)')
		}),
		execute: async (args, { log, session }) => {
			const { 
				sessionId, 
				problemStatement, 
				targetUsers, 
				successCriteria,
				functionalRequirements,
				nonFunctionalRequirements = []
			} = args;

			try {
				// Get project root from session or args
				const projectRoot = getProjectRootFromSession(session, log);
				
				log.info(`Synthesizing requirements for session: ${sessionId} in root: ${projectRoot}`);

				// Initialize session manager
				const sessionManager = new DiscoverySessionManager(projectRoot);

				// Load current session
				const currentSession = await sessionManager.getSession(sessionId);
				if (!currentSession) {
					return createErrorResponse(`Discovery session ${sessionId} not found`);
				}

				// Validate session is in appropriate stage
				if (currentSession.stage !== DISCOVERY_STAGES.TECHNICAL_FEASIBILITY && 
					currentSession.stage !== DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS) {
					return createErrorResponse(
						`Requirements synthesis can only be conducted during Technical Feasibility or Requirements Synthesis stages. Current stage: ${currentSession.stage}`
					);
				}

				// Validate requirements count
				if (functionalRequirements.length < DISCOVERY_DEFAULTS.MIN_REQUIREMENTS_COUNT) {
					return createErrorResponse(
						`Minimum ${DISCOVERY_DEFAULTS.MIN_REQUIREMENTS_COUNT} functional requirements required. Provided: ${functionalRequirements.length}`
					);
				}

				if (functionalRequirements.length > DISCOVERY_DEFAULTS.MAX_REQUIREMENTS_COUNT) {
					return createErrorResponse(
						`Maximum ${DISCOVERY_DEFAULTS.MAX_REQUIREMENTS_COUNT} functional requirements allowed. Provided: ${functionalRequirements.length}`
					);
				}

				// Synthesize requirements data
				const synthesizedData = {
					problemStatement,
					targetUsers,
					successCriteria,
					functionalRequirements: functionalRequirements.map((req, index) => ({
						...req,
						id: req.id || `FR-${String(index + 1).padStart(3, '0')}`,
						synthesizedAt: new Date().toISOString()
					})),
					nonFunctionalRequirements: nonFunctionalRequirements.map((req, index) => ({
						...req,
						id: req.id || `NFR-${String(index + 1).padStart(3, '0')}`,
						synthesizedAt: new Date().toISOString()
					})),
					researchSummary: {
						marketResearch: currentSession.researchData?.marketAnalysis?.length || 0,
						technicalValidation: currentSession.researchData?.technicalValidation?.length || 0,
						competitiveAnalysis: currentSession.researchData?.competitiveAnalysis?.length || 0
					}
				};

				// Update session with synthesized requirements
				const progressUpdate = {
					completionScore: 100, // Requirements synthesis marks completion of this stage
					lastActivity: new Date().toISOString(),
					requirementsSynthesized: true,
					functionalRequirementsCount: functionalRequirements.length,
					nonFunctionalRequirementsCount: nonFunctionalRequirements.length,
					data: synthesizedData
				};

				await sessionManager.updateStageProgress(
					sessionId, 
					DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS, 
					progressUpdate
				);

				// Advance to requirements synthesis stage if still in technical feasibility
				if (currentSession.stage === DISCOVERY_STAGES.TECHNICAL_FEASIBILITY) {
					await sessionManager.advanceStage(sessionId);
				}

				// Calculate requirements quality score
				const qualityMetrics = this.calculateRequirementsQuality(
					functionalRequirements, 
					nonFunctionalRequirements,
					synthesizedData
				);

				// Format response data
				const responseData = {
					sessionId,
					stage: DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS,
					synthesizedRequirements: synthesizedData,
					qualityMetrics,
					summary: {
						totalFunctionalRequirements: functionalRequirements.length,
						totalNonFunctionalRequirements: nonFunctionalRequirements.length,
						highPriorityRequirements: functionalRequirements.filter(r => r.priority === 'HIGH').length,
						targetUserGroups: targetUsers.length,
						successCriteriaCount: successCriteria.length,
						qualityScore: qualityMetrics.overallScore
					},
					readinessAssessment: {
						readyForPRD: qualityMetrics.overallScore >= 70,
						missingElements: qualityMetrics.gaps,
						recommendations: qualityMetrics.recommendations
					},
					nextSteps: qualityMetrics.overallScore >= 70 ? [
						'Requirements synthesis complete - ready for PRD generation',
						'Review synthesized requirements for completeness',
						'Proceed to PRD generation phase',
						'Consider stakeholder review of requirements'
					] : [
						'Address identified gaps in requirements quality',
						'Add missing non-functional requirements if needed',
						'Clarify ambiguous requirements',
						'Re-run synthesis after improvements'
					],
					availableTools: qualityMetrics.overallScore >= 70 ? [
						'generate-prd',
						'assess-prd-quality'
					] : [
						'research-market-opportunity',
						'validate-technical-feasibility'
					]
				};

				return handleApiResult(
					{ success: true, data: responseData },
					log,
					'Error synthesizing requirements',
					null,
					projectRoot
				);

			} catch (error) {
				log.error(`Error in synthesize-requirements tool: ${error.message}\n${error.stack}`);
				
				// Handle specific error cases
				if (error.message.includes(DISCOVERY_ERROR_CODES.SESSION_NOT_FOUND)) {
					return createErrorResponse(
						`Discovery session ${sessionId} not found. Use start-discovery-session to create a new session.`
					);
				}
				
				return createErrorResponse(`Failed to synthesize requirements: ${error.message}`);
			}
		}
	});

	/**
	 * Calculate requirements quality metrics
	 * @param {Array} functionalRequirements - Functional requirements
	 * @param {Array} nonFunctionalRequirements - Non-functional requirements  
	 * @param {Object} synthesizedData - Complete synthesized data
	 * @returns {Object} Quality metrics and recommendations
	 */
	function calculateRequirementsQuality(functionalRequirements, nonFunctionalRequirements, synthesizedData) {
		const metrics = {
			completeness: 0,
			clarity: 0,
			testability: 0,
			overallScore: 0,
			gaps: [],
			recommendations: []
		};

		// Completeness score (40% of total)
		let completenessScore = 0;
		if (functionalRequirements.length >= 5) completenessScore += 25;
		if (nonFunctionalRequirements.length >= 3) completenessScore += 25;
		if (synthesizedData.targetUsers.length >= 2) completenessScore += 25;
		if (synthesizedData.successCriteria.length >= 3) completenessScore += 25;
		metrics.completeness = completenessScore;

		// Clarity score (30% of total)
		const hasUserStories = functionalRequirements.filter(r => r.userStory).length;
		const hasAcceptanceCriteria = nonFunctionalRequirements.filter(r => r.acceptanceCriteria).length;
		metrics.clarity = Math.min(100, (hasUserStories / functionalRequirements.length * 50) + 
								  (hasAcceptanceCriteria / Math.max(1, nonFunctionalRequirements.length) * 50));

		// Testability score (30% of total)
		const testableRequirements = functionalRequirements.filter(r => 
			r.description.includes('should') || r.description.includes('must') || r.userStory
		).length;
		metrics.testability = (testableRequirements / functionalRequirements.length) * 100;

		// Calculate overall score
		metrics.overallScore = Math.round(
			(metrics.completeness * 0.4) + 
			(metrics.clarity * 0.3) + 
			(metrics.testability * 0.3)
		);

		// Identify gaps and recommendations
		if (functionalRequirements.length < 5) {
			metrics.gaps.push('Insufficient functional requirements');
			metrics.recommendations.push('Add more detailed functional requirements');
		}
		if (nonFunctionalRequirements.length < 3) {
			metrics.gaps.push('Missing non-functional requirements');
			metrics.recommendations.push('Define performance, security, and usability requirements');
		}
		if (hasUserStories < functionalRequirements.length * 0.5) {
			metrics.gaps.push('Limited user story coverage');
			metrics.recommendations.push('Convert requirements to user story format for better clarity');
		}

		return metrics;
	}
}
