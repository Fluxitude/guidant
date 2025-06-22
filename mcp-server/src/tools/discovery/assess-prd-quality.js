/**
 * tools/discovery/assess-prd-quality.js
 * MCP tool for automated PRD quality assessment with scoring and recommendations
 */

import { z } from 'zod';
import fs from 'fs/promises';
import {
	handleApiResult,
	createErrorResponse,
	getProjectRootFromSession
} from '../utils.js';
import { DiscoverySessionManager } from '../../core/discovery/discovery-session-manager.js';
import { QualityAssessor } from '../../core/discovery/quality-assessor.js';
import {
	DISCOVERY_STAGES,
	DISCOVERY_SESSION_STATUS,
	DISCOVERY_MESSAGES,
	DISCOVERY_ERROR_CODES,
	PRD_QUALITY_THRESHOLDS
} from '../../core/discovery/constants.js';

/**
 * Register the assess-prd-quality tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerAssessPRDQualityTool(server) {
	server.addTool({
		name: 'assess_prd_quality',
		description: 'Assess PRD quality with comprehensive scoring, gap analysis, and improvement recommendations',
		parameters: z.object({
			sessionId: z
				.string()
				.uuid()
				.optional()
				.describe('Discovery session ID (if assessing generated PRD)'),
			prdFilePath: z
				.string()
				.optional()
				.describe('Path to PRD file to assess (alternative to sessionId)'),
			prdContent: z
				.string()
				.optional()
				.describe('PRD content text to assess directly'),
			assessmentType: z
				.enum(['comprehensive', 'quick', 'focused'])
				.optional()
				.default('comprehensive')
				.describe('Type of quality assessment to perform'),
			focusAreas: z
				.array(z.enum(['completeness', 'clarity', 'technical-feasibility', 'market-validation', 'requirements-coverage']))
				.optional()
				.describe('Specific areas to focus assessment on (for focused assessment type)'),
			generateReport: z
				.boolean()
				.optional()
				.default(false)
				.describe('Generate detailed assessment report file'),
			projectRoot: z
				.string()
				.optional()
				.describe('Absolute path to the project root directory (Optional, usually from session)')
		}),
		execute: async (args, { log, session }) => {
			const { 
				sessionId, 
				prdFilePath, 
				prdContent,
				assessmentType = 'comprehensive',
				focusAreas = [],
				generateReport = false
			} = args;

			try {
				// Get project root from session or args
				const projectRoot = getProjectRootFromSession(session, log);
				
				log.info(`Assessing PRD quality with ${assessmentType} assessment in root: ${projectRoot}`);

				// Validate input parameters
				if (!sessionId && !prdFilePath && !prdContent) {
					return createErrorResponse('Must provide either sessionId, prdFilePath, or prdContent');
				}

				// Initialize components
				const sessionManager = new DiscoverySessionManager(projectRoot);
				const qualityAssessor = new QualityAssessor();

				// Get PRD content and discovery session data
				const { content, discoverySession, prdStructure } = await getPRDData(
					sessionId,
					prdFilePath,
					prdContent,
					sessionManager,
					projectRoot
				);

				// Perform quality assessment
				log.info('Performing PRD quality assessment...');
				const qualityAssessment = qualityAssessor.assessPRDQuality(
					content, 
					discoverySession, 
					prdStructure
				);

				// Filter assessment based on focus areas if specified
				if (assessmentType === 'focused' && focusAreas.length > 0) {
					qualityAssessment.criteriaScores = filterCriteriaScores(
						qualityAssessment.criteriaScores,
						focusAreas
					);
					qualityAssessment.overallScore = qualityAssessor.calculateOverallScore(
						qualityAssessment.criteriaScores
					);
				}

				// Update discovery session if sessionId provided
				if (sessionId && discoverySession) {
					await updateSessionWithAssessment(
						sessionManager,
						sessionId,
						qualityAssessment
					);
				}

				// Generate detailed report if requested
				let reportPath = null;
				if (generateReport) {
					reportPath = await generateAssessmentReport(
						qualityAssessment,
						discoverySession,
						content,
						projectRoot
					);
				}

				// Format response data
				const responseData = {
					sessionId: sessionId || null,
					assessmentType,
					qualityAssessment: {
						overallScore: qualityAssessment.overallScore,
						qualityLevel: qualityAssessment.qualityLevel,
						criteriaScores: qualityAssessment.criteriaScores,
						readinessMetrics: qualityAssessment.readinessMetrics
					},
					gaps: qualityAssessment.gaps,
					recommendations: qualityAssessment.recommendations,
					assessmentDetails: qualityAssessment.assessmentDetails,
					summary: {
						wordCount: qualityAssessment.assessmentDetails.wordCount,
						sectionCount: qualityAssessment.assessmentDetails.sectionCount,
						requirementsCount: qualityAssessment.assessmentDetails.requirementsCount,
						readyForDevelopment: qualityAssessment.readinessMetrics.readyForDevelopment,
						readyForTaskGeneration: qualityAssessment.readinessMetrics.readyForTaskGeneration,
						confidenceLevel: qualityAssessment.readinessMetrics.confidenceLevel,
						reportPath
					},
					improvementPlan: generateImprovementPlan(qualityAssessment, discoverySession),
					nextSteps: generateNextSteps(qualityAssessment, discoverySession)
				};

				return handleApiResult(
					{ success: true, data: responseData },
					log,
					'Error assessing PRD quality',
					null,
					projectRoot
				);

			} catch (error) {
				log.error(`Error in assess-prd-quality tool: ${error.message}\n${error.stack}`);
				
				// Handle specific error cases
				if (error.message.includes('not found')) {
					return createErrorResponse(
						`PRD or session not found. Verify the sessionId, file path, or content provided.`
					);
				}
				
				return createErrorResponse(`Failed to assess PRD quality: ${error.message}`);
			}
		}
	});

	/**
	 * Get PRD data from various sources
	 * @param {string} sessionId - Session ID
	 * @param {string} prdFilePath - PRD file path
	 * @param {string} prdContent - PRD content
	 * @param {Object} sessionManager - Session manager instance
	 * @param {string} projectRoot - Project root path
	 * @returns {Promise<Object>} PRD data
	 */
	async function getPRDData(sessionId, prdFilePath, prdContent, sessionManager, projectRoot) {
		let content = prdContent;
		let discoverySession = null;
		let prdStructure = null;

		// Get from discovery session
		if (sessionId) {
			discoverySession = await sessionManager.getSession(sessionId);
			if (!discoverySession) {
				throw new Error(`Discovery session ${sessionId} not found`);
			}

			// Get PRD content from session
			const prdData = discoverySession.progress?.[DISCOVERY_STAGES.PRD_GENERATION]?.data;
			if (prdData?.prdContent) {
				content = prdData.prdContent;
				prdStructure = prdData.prdStructure;
			} else if (!content && !prdFilePath) {
				throw new Error('No PRD content found in session. Generate PRD first using generate-prd tool.');
			}
		}

		// Get from file path
		if (prdFilePath && !content) {
			try {
				const fullPath = prdFilePath.startsWith('/') ? prdFilePath : `${projectRoot}/${prdFilePath}`;
				content = await fs.readFile(fullPath, 'utf-8');
			} catch (error) {
				throw new Error(`Failed to read PRD file: ${error.message}`);
			}
		}

		// Validate content exists
		if (!content) {
			throw new Error('No PRD content available for assessment');
		}

		return { content, discoverySession, prdStructure };
	}

	/**
	 * Filter criteria scores based on focus areas
	 * @param {Object} criteriaScores - All criteria scores
	 * @param {Array} focusAreas - Areas to focus on
	 * @returns {Object} Filtered criteria scores
	 */
	function filterCriteriaScores(criteriaScores, focusAreas) {
		const filtered = {};
		focusAreas.forEach(area => {
			if (criteriaScores[area] !== undefined) {
				filtered[area] = criteriaScores[area];
			}
		});
		return filtered;
	}

	/**
	 * Update discovery session with assessment results
	 * @param {Object} sessionManager - Session manager
	 * @param {string} sessionId - Session ID
	 * @param {Object} qualityAssessment - Assessment results
	 */
	async function updateSessionWithAssessment(sessionManager, sessionId, qualityAssessment) {
		const updateData = {
			lastActivity: new Date().toISOString(),
			qualityAssessed: true,
			qualityScore: qualityAssessment.overallScore,
			qualityLevel: qualityAssessment.qualityLevel,
			assessmentData: {
				criteriaScores: qualityAssessment.criteriaScores,
				gaps: qualityAssessment.gaps,
				recommendations: qualityAssessment.recommendations,
				assessedAt: new Date().toISOString()
			}
		};

		await sessionManager.updateStageProgress(
			sessionId,
			DISCOVERY_STAGES.PRD_GENERATION,
			updateData
		);
	}

	/**
	 * Generate detailed assessment report
	 * @param {Object} qualityAssessment - Assessment results
	 * @param {Object} discoverySession - Discovery session data
	 * @param {string} content - PRD content
	 * @param {string} projectRoot - Project root path
	 * @returns {Promise<string>} Report file path
	 */
	async function generateAssessmentReport(qualityAssessment, discoverySession, content, projectRoot) {
		const reportContent = `# PRD Quality Assessment Report

**Generated**: ${new Date().toISOString()}
**Project**: ${discoverySession?.projectName || 'Unknown'}
**Session ID**: ${discoverySession?.sessionId || 'N/A'}

## Overall Assessment

- **Quality Score**: ${qualityAssessment.overallScore}/100
- **Quality Level**: ${qualityAssessment.qualityLevel}
- **Confidence Level**: ${qualityAssessment.readinessMetrics.confidenceLevel}

## Criteria Scores

${Object.entries(qualityAssessment.criteriaScores).map(([criterion, score]) => 
	`- **${criterion}**: ${score}/100`
).join('\n')}

## Identified Gaps

${qualityAssessment.gaps.map(gap => `- ${gap}`).join('\n')}

## Recommendations

${qualityAssessment.recommendations.map(rec => `- ${rec}`).join('\n')}

## Readiness Metrics

- **Ready for Development**: ${qualityAssessment.readinessMetrics.readyForDevelopment ? 'Yes' : 'No'}
- **Ready for Task Generation**: ${qualityAssessment.readinessMetrics.readyForTaskGeneration ? 'Yes' : 'No'}
- **Estimated Improvement Effort**: ${qualityAssessment.readinessMetrics.estimatedEffort}

## Priority Areas for Improvement

${qualityAssessment.readinessMetrics.priorityAreas.map(area => `- ${area}`).join('\n')}

## Assessment Details

- **Word Count**: ${qualityAssessment.assessmentDetails.wordCount}
- **Section Count**: ${qualityAssessment.assessmentDetails.sectionCount}
- **Requirements Count**: ${qualityAssessment.assessmentDetails.requirementsCount}
`;

		// Save report
		const reportsDir = `${projectRoot}/.taskmaster/reports`;
		await fs.mkdir(reportsDir, { recursive: true });
		
		const timestamp = new Date().toISOString().split('T')[0];
		const filename = `prd-quality-assessment-${timestamp}.md`;
		const reportPath = `${reportsDir}/${filename}`;
		
		await fs.writeFile(reportPath, reportContent, 'utf-8');
		
		return reportPath;
	}

	/**
	 * Generate improvement plan based on assessment
	 * @param {Object} qualityAssessment - Assessment results
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {Object} Improvement plan
	 */
	function generateImprovementPlan(qualityAssessment, discoverySession) {
		const plan = {
			priority: qualityAssessment.readinessMetrics.estimatedEffort,
			phases: [],
			estimatedTimeframe: estimateTimeframe(qualityAssessment.readinessMetrics.estimatedEffort)
		};

		// Phase 1: Address critical gaps
		if (qualityAssessment.gaps.length > 0) {
			plan.phases.push({
				phase: 1,
				title: 'Address Critical Gaps',
				tasks: qualityAssessment.gaps.slice(0, 3),
				priority: 'high'
			});
		}

		// Phase 2: Implement recommendations
		if (qualityAssessment.recommendations.length > 0) {
			plan.phases.push({
				phase: 2,
				title: 'Implement Recommendations',
				tasks: qualityAssessment.recommendations.slice(0, 5),
				priority: 'medium'
			});
		}

		// Phase 3: Quality validation
		plan.phases.push({
			phase: 3,
			title: 'Quality Validation',
			tasks: [
				'Re-run quality assessment',
				'Validate readiness metrics',
				'Stakeholder review'
			],
			priority: 'low'
		});

		return plan;
	}

	/**
	 * Generate next steps based on assessment
	 * @param {Object} qualityAssessment - Assessment results
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {Array} Next steps
	 */
	function generateNextSteps(qualityAssessment, discoverySession) {
		const nextSteps = [];

		if (qualityAssessment.overallScore >= PRD_QUALITY_THRESHOLDS.GOOD) {
			nextSteps.push(
				'PRD quality is good - ready for development',
				'Proceed with task generation using parse-prd tool',
				'Consider stakeholder review and approval',
				'Set up development environment and project structure'
			);
		} else if (qualityAssessment.overallScore >= PRD_QUALITY_THRESHOLDS.ACCEPTABLE) {
			nextSteps.push(
				'PRD quality is acceptable with room for improvement',
				'Address top 2-3 recommendations for better quality',
				'Ready for task generation with minor improvements',
				'Consider additional discovery research if needed'
			);
		} else {
			nextSteps.push(
				'PRD quality needs significant improvement',
				'Address identified gaps before proceeding',
				'Conduct additional discovery research',
				'Re-generate PRD after improvements'
			);
		}

		// Add specific next steps based on priority areas
		if (qualityAssessment.readinessMetrics.priorityAreas.length > 0) {
			const topPriority = qualityAssessment.readinessMetrics.priorityAreas[0];
			nextSteps.push(`Priority focus: Improve ${topPriority}`);
		}

		return nextSteps;
	}

	/**
	 * Estimate timeframe for improvements
	 * @param {string} effort - Effort level
	 * @returns {string} Timeframe estimate
	 */
	function estimateTimeframe(effort) {
		switch (effort) {
			case 'minimal': return '1-2 hours';
			case 'low': return '2-4 hours';
			case 'medium': return '4-8 hours';
			case 'high': return '1-2 days';
			default: return '2-4 hours';
		}
	}
}
