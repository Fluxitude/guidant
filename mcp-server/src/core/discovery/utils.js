/**
 * mcp-server/src/core/discovery/utils.js
 * Utility functions for discovery session management
 */

import {
	DISCOVERY_STAGES,
	DISCOVERY_SESSION_STATUS,
	STAGE_STATUS,
	DISCOVERY_STAGE_ORDER,
	DISCOVERY_STAGE_NAMES,
	RESEARCH_QUERY_TYPES,
	RESEARCH_ROUTING_PATTERNS,
	PRD_QUALITY_THRESHOLDS,
	VALIDATION_RULES
} from './constants.js';

/**
 * Validate project name according to rules
 */
export function validateProjectName(projectName) {
	if (!projectName || typeof projectName !== 'string') {
		return { valid: false, error: 'Project name is required' };
	}

	const { MIN_LENGTH, MAX_LENGTH, PATTERN } = VALIDATION_RULES.PROJECT_NAME;
	
	if (projectName.length < MIN_LENGTH) {
		return { valid: false, error: `Project name must be at least ${MIN_LENGTH} characters` };
	}
	
	if (projectName.length > MAX_LENGTH) {
		return { valid: false, error: `Project name must be no more than ${MAX_LENGTH} characters` };
	}
	
	if (!PATTERN.test(projectName)) {
		return { valid: false, error: 'Project name contains invalid characters' };
	}

	return { valid: true };
}

/**
 * Validate problem statement
 */
export function validateProblemStatement(statement) {
	if (!statement || typeof statement !== 'string') {
		return { valid: false, error: 'Problem statement is required' };
	}

	const { MIN_LENGTH, MAX_LENGTH } = VALIDATION_RULES.PROBLEM_STATEMENT;
	
	if (statement.length < MIN_LENGTH) {
		return { valid: false, error: `Problem statement must be at least ${MIN_LENGTH} characters` };
	}
	
	if (statement.length > MAX_LENGTH) {
		return { valid: false, error: `Problem statement must be no more than ${MAX_LENGTH} characters` };
	}

	return { valid: true };
}

/**
 * Calculate overall session progress
 */
export function calculateSessionProgress(session) {
	if (!session || !session.progress) {
		return { overallProgress: 0, stageProgress: {} };
	}

	const stages = DISCOVERY_STAGE_ORDER;
	let totalScore = 0;
	let completedStages = 0;
	const stageProgress = {};

	stages.forEach(stage => {
		const stageData = session.progress[stage];
		if (stageData) {
			const score = stageData.completionScore || 0;
			totalScore += score;
			
			if (stageData.status === STAGE_STATUS.COMPLETED) {
				completedStages++;
			}

			stageProgress[stage] = {
				name: DISCOVERY_STAGE_NAMES[stage],
				status: stageData.status,
				score: score,
				completed: stageData.status === STAGE_STATUS.COMPLETED
			};
		}
	});

	const overallProgress = Math.round(totalScore / stages.length);

	return {
		overallProgress,
		completedStages,
		totalStages: stages.length,
		stageProgress
	};
}

/**
 * Get next stage in discovery workflow
 */
export function getNextStage(currentStage) {
	const currentIndex = DISCOVERY_STAGE_ORDER.indexOf(currentStage);
	if (currentIndex === -1 || currentIndex === DISCOVERY_STAGE_ORDER.length - 1) {
		return null;
	}
	return DISCOVERY_STAGE_ORDER[currentIndex + 1];
}

/**
 * Get previous stage in discovery workflow
 */
export function getPreviousStage(currentStage) {
	const currentIndex = DISCOVERY_STAGE_ORDER.indexOf(currentStage);
	if (currentIndex <= 0) {
		return null;
	}
	return DISCOVERY_STAGE_ORDER[currentIndex - 1];
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session, timeoutHours = 24) {
	if (!session || !session.created) {
		return true;
	}

	const sessionAge = Date.now() - new Date(session.created).getTime();
	const maxAge = timeoutHours * 60 * 60 * 1000;
	
	return sessionAge > maxAge;
}

/**
 * Determine research query type based on content
 */
export function classifyResearchQuery(query, context = {}) {
	const queryLower = query.toLowerCase();
	const contextLower = JSON.stringify(context).toLowerCase();
	const combinedText = `${queryLower} ${contextLower}`;

	// Check for technical keywords
	const technicalMatches = RESEARCH_ROUTING_PATTERNS.TECHNICAL_KEYWORDS.filter(
		keyword => combinedText.includes(keyword.toLowerCase())
	).length;

	// Check for market keywords
	const marketMatches = RESEARCH_ROUTING_PATTERNS.MARKET_KEYWORDS.filter(
		keyword => combinedText.includes(keyword.toLowerCase())
	).length;

	// Determine query type based on keyword matches
	if (technicalMatches > marketMatches && technicalMatches > 0) {
		return RESEARCH_QUERY_TYPES.TECHNICAL;
	} else if (marketMatches > technicalMatches && marketMatches > 0) {
		return RESEARCH_QUERY_TYPES.MARKET;
	} else if (technicalMatches > 0 && marketMatches > 0) {
		return RESEARCH_QUERY_TYPES.HYBRID;
	} else if (queryLower.includes('competitor') || queryLower.includes('competition')) {
		return RESEARCH_QUERY_TYPES.COMPETITIVE;
	} else {
		return RESEARCH_QUERY_TYPES.GENERAL;
	}
}

/**
 * Format session summary for display
 */
export function formatSessionSummary(session) {
	if (!session) {
		return 'No active discovery session';
	}

	const progress = calculateSessionProgress(session);
	const currentStageName = DISCOVERY_STAGE_NAMES[session.stage] || session.stage;
	
	return {
		projectName: session.projectName,
		sessionId: session.sessionId,
		status: session.status,
		currentStage: currentStageName,
		overallProgress: progress.overallProgress,
		completedStages: progress.completedStages,
		totalStages: progress.totalStages,
		created: new Date(session.created).toLocaleDateString(),
		lastUpdated: new Date(session.lastUpdated).toLocaleDateString(),
		stageProgress: progress.stageProgress
	};
}

/**
 * Serialize session data for storage
 */
export function serializeSessionData(session) {
	try {
		return JSON.stringify(session, null, 2);
	} catch (error) {
		throw new Error(`Failed to serialize session data: ${error.message}`);
	}
}

/**
 * Deserialize session data from storage
 */
export function deserializeSessionData(serializedData) {
	try {
		return JSON.parse(serializedData);
	} catch (error) {
		throw new Error(`Failed to deserialize session data: ${error.message}`);
	}
}

/**
 * Validate stage data completeness
 */
export function validateStageData(stage, data) {
	const validation = { valid: true, errors: [], warnings: [] };

	switch (stage) {
		case DISCOVERY_STAGES.PROBLEM_DISCOVERY:
			if (!data.problemStatement || data.problemStatement.trim().length < 10) {
				validation.errors.push('Problem statement is required and must be descriptive');
			}
			if (!data.targetAudience || data.targetAudience.trim().length < 5) {
				validation.warnings.push('Target audience should be specified');
			}
			if (!data.successCriteria || data.successCriteria.length === 0) {
				validation.warnings.push('Success criteria should be defined');
			}
			break;

		case DISCOVERY_STAGES.MARKET_RESEARCH:
			if (!data.competitorAnalysis || data.competitorAnalysis.length === 0) {
				validation.warnings.push('Competitor analysis would strengthen the research');
			}
			if (!data.marketSize) {
				validation.warnings.push('Market size estimation would be valuable');
			}
			break;

		case DISCOVERY_STAGES.TECHNICAL_FEASIBILITY:
			if (!data.recommendedTechStack) {
				validation.warnings.push('Technology stack recommendations are helpful');
			}
			if (!data.complexityAssessment) {
				validation.warnings.push('Complexity assessment helps with planning');
			}
			break;

		case DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS:
			if (!data.functionalRequirements || data.functionalRequirements.length === 0) {
				validation.errors.push('Functional requirements are required');
			}
			if (!data.nonFunctionalRequirements || data.nonFunctionalRequirements.length === 0) {
				validation.warnings.push('Non-functional requirements should be considered');
			}
			break;

		case DISCOVERY_STAGES.PRD_GENERATION:
			if (!data.prdContent || data.prdContent.trim().length < 100) {
				validation.errors.push('PRD content is required and must be comprehensive');
			}
			if (!data.qualityAssessment || !data.qualityAssessment.overallScore) {
				validation.warnings.push('Quality assessment is recommended');
			}
			break;
	}

	validation.valid = validation.errors.length === 0;
	return validation;
}

/**
 * Calculate PRD quality score
 */
export function calculatePRDQualityScore(prdContent, discoveryData) {
	let score = 0;
	const criteria = {};

	// Completeness (30 points)
	const contentLength = prdContent.length;
	if (contentLength > 2000) criteria.completeness = 30;
	else if (contentLength > 1000) criteria.completeness = 20;
	else if (contentLength > 500) criteria.completeness = 10;
	else criteria.completeness = 0;

	// Clarity (20 points)
	const sections = ['overview', 'requirements', 'features', 'technical'];
	const foundSections = sections.filter(section => 
		prdContent.toLowerCase().includes(section)
	).length;
	criteria.clarity = Math.round((foundSections / sections.length) * 20);

	// Technical feasibility (20 points)
	if (discoveryData.technicalFeasibility && discoveryData.technicalFeasibility.recommendedTechStack) {
		criteria.technicalFeasibility = 20;
	} else if (prdContent.toLowerCase().includes('technical') || prdContent.toLowerCase().includes('technology')) {
		criteria.technicalFeasibility = 10;
	} else {
		criteria.technicalFeasibility = 0;
	}

	// Market validation (15 points)
	if (discoveryData.marketResearch && discoveryData.marketResearch.competitorAnalysis) {
		criteria.marketValidation = 15;
	} else if (prdContent.toLowerCase().includes('market') || prdContent.toLowerCase().includes('competitor')) {
		criteria.marketValidation = 8;
	} else {
		criteria.marketValidation = 0;
	}

	// Requirements coverage (15 points)
	if (discoveryData.requirementsSynthesis && discoveryData.requirementsSynthesis.functionalRequirements) {
		const reqCount = discoveryData.requirementsSynthesis.functionalRequirements.length;
		if (reqCount >= 10) criteria.requirementsCoverage = 15;
		else if (reqCount >= 5) criteria.requirementsCoverage = 10;
		else if (reqCount >= 3) criteria.requirementsCoverage = 5;
		else criteria.requirementsCoverage = 0;
	} else {
		criteria.requirementsCoverage = 0;
	}

	// Calculate total score
	score = Object.values(criteria).reduce((sum, value) => sum + value, 0);

	// Determine quality level
	let qualityLevel = 'poor';
	if (score >= PRD_QUALITY_THRESHOLDS.EXCELLENT) qualityLevel = 'excellent';
	else if (score >= PRD_QUALITY_THRESHOLDS.GOOD) qualityLevel = 'good';
	else if (score >= PRD_QUALITY_THRESHOLDS.ACCEPTABLE) qualityLevel = 'acceptable';
	else if (score >= PRD_QUALITY_THRESHOLDS.NEEDS_IMPROVEMENT) qualityLevel = 'needs-improvement';

	return {
		overallScore: score,
		qualityLevel,
		criteria,
		recommendations: generateQualityRecommendations(criteria, score)
	};
}

/**
 * Generate quality improvement recommendations
 */
function generateQualityRecommendations(criteria, overallScore) {
	const recommendations = [];

	if (criteria.completeness < 20) {
		recommendations.push('Add more detailed content to improve completeness');
	}
	if (criteria.clarity < 15) {
		recommendations.push('Include clear sections for overview, requirements, features, and technical details');
	}
	if (criteria.technicalFeasibility < 15) {
		recommendations.push('Add technical architecture and implementation details');
	}
	if (criteria.marketValidation < 10) {
		recommendations.push('Include market research and competitive analysis');
	}
	if (criteria.requirementsCoverage < 10) {
		recommendations.push('Expand functional and non-functional requirements');
	}

	if (overallScore < PRD_QUALITY_THRESHOLDS.ACCEPTABLE) {
		recommendations.push('Consider conducting additional discovery research to strengthen the PRD');
	}

	return recommendations;
}
