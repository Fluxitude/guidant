/**
 * mcp-server/src/core/discovery/quality-assessor.js
 * PRD quality assessment engine with scoring algorithms and gap analysis
 */

import { 
	PRD_QUALITY_CRITERIA, 
	PRD_QUALITY_THRESHOLDS,
	DISCOVERY_DEFAULTS 
} from './constants.js';

export class QualityAssessor {
	constructor() {
		this.criteria = PRD_QUALITY_CRITERIA;
		this.thresholds = PRD_QUALITY_THRESHOLDS;
		this.weightings = {
			[PRD_QUALITY_CRITERIA.COMPLETENESS]: 0.25,
			[PRD_QUALITY_CRITERIA.CLARITY]: 0.20,
			[PRD_QUALITY_CRITERIA.TECHNICAL_FEASIBILITY]: 0.20,
			[PRD_QUALITY_CRITERIA.MARKET_VALIDATION]: 0.15,
			[PRD_QUALITY_CRITERIA.REQUIREMENTS_COVERAGE]: 0.20
		};
	}

	/**
	 * Assess PRD quality comprehensively
	 * @param {string} prdContent - PRD content text
	 * @param {Object} discoverySession - Discovery session data
	 * @param {Object} prdStructure - Structured PRD data
	 * @returns {Object} Quality assessment results
	 */
	assessPRDQuality(prdContent, discoverySession, prdStructure = null) {
		try {
			// Individual criteria assessments
			const criteriaScores = {
				[PRD_QUALITY_CRITERIA.COMPLETENESS]: this.assessCompleteness(prdContent, prdStructure),
				[PRD_QUALITY_CRITERIA.CLARITY]: this.assessClarity(prdContent, prdStructure),
				[PRD_QUALITY_CRITERIA.TECHNICAL_FEASIBILITY]: this.assessTechnicalFeasibility(prdContent, discoverySession),
				[PRD_QUALITY_CRITERIA.MARKET_VALIDATION]: this.assessMarketValidation(prdContent, discoverySession),
				[PRD_QUALITY_CRITERIA.REQUIREMENTS_COVERAGE]: this.assessRequirementsCoverage(prdContent, discoverySession)
			};

			// Calculate weighted overall score
			const overallScore = this.calculateOverallScore(criteriaScores);

			// Determine quality level
			const qualityLevel = this.determineQualityLevel(overallScore);

			// Identify gaps and generate recommendations
			const gaps = this.identifyGaps(criteriaScores, prdContent, discoverySession);
			const recommendations = this.generateRecommendations(criteriaScores, gaps, discoverySession);

			// Calculate readiness metrics
			const readinessMetrics = this.calculateReadinessMetrics(criteriaScores, discoverySession);

			return {
				overallScore: Math.round(overallScore),
				qualityLevel,
				criteriaScores,
				gaps,
				recommendations,
				readinessMetrics,
				assessmentDetails: {
					wordCount: prdContent.split(/\s+/).length,
					sectionCount: this.countSections(prdContent),
					requirementsCount: this.countRequirements(prdContent),
					assessedAt: new Date().toISOString()
				}
			};

		} catch (error) {
			throw new Error(`Quality assessment failed: ${error.message}`);
		}
	}

	/**
	 * Assess PRD completeness
	 * @param {string} prdContent - PRD content
	 * @param {Object} prdStructure - PRD structure
	 * @returns {number} Completeness score (0-100)
	 */
	assessCompleteness(prdContent, prdStructure) {
		let score = 0;
		const maxScore = 100;

		// Content length assessment (30 points)
		const wordCount = prdContent.split(/\s+/).length;
		if (wordCount >= 2000) score += 30;
		else if (wordCount >= 1500) score += 25;
		else if (wordCount >= 1000) score += 20;
		else if (wordCount >= 500) score += 15;
		else score += 10;

		// Essential sections presence (40 points)
		const essentialSections = [
			'overview', 'problem', 'solution', 'requirements', 
			'technical', 'market', 'success'
		];
		const contentLower = prdContent.toLowerCase();
		const foundSections = essentialSections.filter(section => 
			contentLower.includes(section)
		).length;
		score += Math.round((foundSections / essentialSections.length) * 40);

		// Requirements detail level (30 points)
		const requirementsCount = this.countRequirements(prdContent);
		if (requirementsCount >= 10) score += 30;
		else if (requirementsCount >= 7) score += 25;
		else if (requirementsCount >= 5) score += 20;
		else if (requirementsCount >= 3) score += 15;
		else score += 10;

		return Math.min(score, maxScore);
	}

	/**
	 * Assess PRD clarity and readability
	 * @param {string} prdContent - PRD content
	 * @param {Object} prdStructure - PRD structure
	 * @returns {number} Clarity score (0-100)
	 */
	assessClarity(prdContent, prdStructure) {
		let score = 0;
		const maxScore = 100;

		// Structure and organization (40 points)
		const sectionCount = this.countSections(prdContent);
		if (sectionCount >= 8) score += 40;
		else if (sectionCount >= 6) score += 35;
		else if (sectionCount >= 4) score += 30;
		else if (sectionCount >= 2) score += 20;
		else score += 10;

		// Clear headings and formatting (30 points)
		const headingMatches = prdContent.match(/^#{1,3}\s+.+$/gm) || [];
		const headingCount = headingMatches.length;
		if (headingCount >= 10) score += 30;
		else if (headingCount >= 7) score += 25;
		else if (headingCount >= 5) score += 20;
		else if (headingCount >= 3) score += 15;
		else score += 10;

		// Specific and actionable language (30 points)
		const actionWords = ['must', 'should', 'will', 'shall', 'required', 'mandatory'];
		const actionWordCount = actionWords.reduce((count, word) => {
			const regex = new RegExp(`\\b${word}\\b`, 'gi');
			return count + (prdContent.match(regex) || []).length;
		}, 0);
		
		if (actionWordCount >= 20) score += 30;
		else if (actionWordCount >= 15) score += 25;
		else if (actionWordCount >= 10) score += 20;
		else if (actionWordCount >= 5) score += 15;
		else score += 10;

		return Math.min(score, maxScore);
	}

	/**
	 * Assess technical feasibility coverage
	 * @param {string} prdContent - PRD content
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {number} Technical feasibility score (0-100)
	 */
	assessTechnicalFeasibility(prdContent, discoverySession) {
		let score = 0;
		const maxScore = 100;

		// Technical specifications presence (40 points)
		const techKeywords = [
			'architecture', 'technology', 'stack', 'database', 
			'api', 'framework', 'platform', 'infrastructure'
		];
		const contentLower = prdContent.toLowerCase();
		const foundTechKeywords = techKeywords.filter(keyword => 
			contentLower.includes(keyword)
		).length;
		score += Math.round((foundTechKeywords / techKeywords.length) * 40);

		// Discovery technical validation data (35 points)
		const techData = discoverySession.progress?.['technical-feasibility']?.data;
		if (techData) {
			if (techData.technologies && techData.technologies.length > 0) score += 15;
			if (techData.architecture) score += 10;
			if (techData.feasibilityAssessment) score += 10;
		}

		// Performance and scalability considerations (25 points)
		const perfKeywords = ['performance', 'scalability', 'load', 'capacity', 'response time'];
		const foundPerfKeywords = perfKeywords.filter(keyword => 
			contentLower.includes(keyword)
		).length;
		score += Math.round((foundPerfKeywords / perfKeywords.length) * 25);

		return Math.min(score, maxScore);
	}

	/**
	 * Assess market validation coverage
	 * @param {string} prdContent - PRD content
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {number} Market validation score (0-100)
	 */
	assessMarketValidation(prdContent, discoverySession) {
		let score = 0;
		const maxScore = 100;

		// Market analysis presence (40 points)
		const marketKeywords = [
			'market', 'competitor', 'customer', 'user', 'target', 
			'audience', 'segment', 'opportunity'
		];
		const contentLower = prdContent.toLowerCase();
		const foundMarketKeywords = marketKeywords.filter(keyword => 
			contentLower.includes(keyword)
		).length;
		score += Math.round((foundMarketKeywords / marketKeywords.length) * 40);

		// Discovery market research data (35 points)
		const marketData = discoverySession.progress?.['market-research']?.data;
		const researchData = discoverySession.researchData?.marketAnalysis;
		if (marketData || (researchData && researchData.length > 0)) {
			score += 35;
		}

		// Business value and ROI considerations (25 points)
		const businessKeywords = ['value', 'benefit', 'roi', 'revenue', 'cost', 'business'];
		const foundBusinessKeywords = businessKeywords.filter(keyword => 
			contentLower.includes(keyword)
		).length;
		score += Math.round((foundBusinessKeywords / businessKeywords.length) * 25);

		return Math.min(score, maxScore);
	}

	/**
	 * Assess requirements coverage and quality
	 * @param {string} prdContent - PRD content
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {number} Requirements coverage score (0-100)
	 */
	assessRequirementsCoverage(prdContent, discoverySession) {
		let score = 0;
		const maxScore = 100;

		// Functional requirements coverage (40 points)
		const reqData = discoverySession.progress?.['requirements-synthesis']?.data;
		if (reqData?.functionalRequirements) {
			const functionalCount = reqData.functionalRequirements.length;
			if (functionalCount >= 10) score += 40;
			else if (functionalCount >= 7) score += 35;
			else if (functionalCount >= 5) score += 30;
			else if (functionalCount >= 3) score += 25;
			else score += 15;
		}

		// Non-functional requirements coverage (30 points)
		if (reqData?.nonFunctionalRequirements) {
			const nonFunctionalCount = reqData.nonFunctionalRequirements.length;
			if (nonFunctionalCount >= 5) score += 30;
			else if (nonFunctionalCount >= 3) score += 25;
			else if (nonFunctionalCount >= 2) score += 20;
			else if (nonFunctionalCount >= 1) score += 15;
			else score += 5;
		}

		// User stories and acceptance criteria (30 points)
		const userStoryMatches = prdContent.match(/as a.*i want.*so that/gi) || [];
		const acceptanceCriteriaMatches = prdContent.match(/acceptance criteria|given.*when.*then/gi) || [];
		
		const userStoryScore = Math.min(15, userStoryMatches.length * 3);
		const acceptanceScore = Math.min(15, acceptanceCriteriaMatches.length * 2);
		score += userStoryScore + acceptanceScore;

		return Math.min(score, maxScore);
	}

	/**
	 * Calculate weighted overall score
	 * @param {Object} criteriaScores - Individual criteria scores
	 * @returns {number} Overall weighted score
	 */
	calculateOverallScore(criteriaScores) {
		return Object.entries(criteriaScores).reduce((total, [criterion, score]) => {
			return total + (score * this.weightings[criterion]);
		}, 0);
	}

	/**
	 * Determine quality level based on score
	 * @param {number} score - Overall score
	 * @returns {string} Quality level
	 */
	determineQualityLevel(score) {
		if (score >= this.thresholds.EXCELLENT) return 'excellent';
		if (score >= this.thresholds.GOOD) return 'good';
		if (score >= this.thresholds.ACCEPTABLE) return 'acceptable';
		if (score >= this.thresholds.NEEDS_IMPROVEMENT) return 'needs-improvement';
		return 'poor';
	}

	/**
	 * Identify gaps in PRD quality
	 * @param {Object} criteriaScores - Criteria scores
	 * @param {string} prdContent - PRD content
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {Array} Identified gaps
	 */
	identifyGaps(criteriaScores, prdContent, discoverySession) {
		const gaps = [];
		const threshold = 70; // Minimum acceptable score for each criterion

		Object.entries(criteriaScores).forEach(([criterion, score]) => {
			if (score < threshold) {
				switch (criterion) {
					case PRD_QUALITY_CRITERIA.COMPLETENESS:
						gaps.push('Insufficient content detail and coverage');
						break;
					case PRD_QUALITY_CRITERIA.CLARITY:
						gaps.push('Unclear structure and ambiguous language');
						break;
					case PRD_QUALITY_CRITERIA.TECHNICAL_FEASIBILITY:
						gaps.push('Missing technical specifications and architecture details');
						break;
					case PRD_QUALITY_CRITERIA.MARKET_VALIDATION:
						gaps.push('Insufficient market research and competitive analysis');
						break;
					case PRD_QUALITY_CRITERIA.REQUIREMENTS_COVERAGE:
						gaps.push('Incomplete requirements definition and user stories');
						break;
				}
			}
		});

		return gaps;
	}

	/**
	 * Generate improvement recommendations
	 * @param {Object} criteriaScores - Criteria scores
	 * @param {Array} gaps - Identified gaps
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {Array} Recommendations
	 */
	generateRecommendations(criteriaScores, gaps, discoverySession) {
		const recommendations = [];

		// Specific recommendations based on scores
		if (criteriaScores[PRD_QUALITY_CRITERIA.COMPLETENESS] < 70) {
			recommendations.push('Add more detailed sections and expand on key concepts');
			recommendations.push('Include implementation details and technical specifications');
		}

		if (criteriaScores[PRD_QUALITY_CRITERIA.CLARITY] < 70) {
			recommendations.push('Improve document structure with clear headings and sections');
			recommendations.push('Use more specific and actionable language');
		}

		if (criteriaScores[PRD_QUALITY_CRITERIA.TECHNICAL_FEASIBILITY] < 70) {
			recommendations.push('Conduct additional technical feasibility validation');
			recommendations.push('Define architecture and technology stack in detail');
		}

		if (criteriaScores[PRD_QUALITY_CRITERIA.MARKET_VALIDATION] < 70) {
			recommendations.push('Perform additional market research and competitive analysis');
			recommendations.push('Validate business value and market opportunity');
		}

		if (criteriaScores[PRD_QUALITY_CRITERIA.REQUIREMENTS_COVERAGE] < 70) {
			recommendations.push('Add more functional and non-functional requirements');
			recommendations.push('Convert requirements to user story format with acceptance criteria');
		}

		return recommendations;
	}

	/**
	 * Calculate readiness metrics for next steps
	 * @param {Object} criteriaScores - Criteria scores
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {Object} Readiness metrics
	 */
	calculateReadinessMetrics(criteriaScores, discoverySession) {
		const overallScore = this.calculateOverallScore(criteriaScores);
		
		return {
			readyForDevelopment: overallScore >= this.thresholds.GOOD,
			readyForStakeholderReview: overallScore >= this.thresholds.ACCEPTABLE,
			readyForTaskGeneration: overallScore >= DISCOVERY_DEFAULTS.PRD_MIN_QUALITY_SCORE,
			confidenceLevel: this.calculateConfidenceLevel(criteriaScores),
			estimatedEffort: this.estimateImprovementEffort(criteriaScores),
			priorityAreas: this.identifyPriorityAreas(criteriaScores)
		};
	}

	/**
	 * Calculate confidence level in PRD quality
	 * @param {Object} criteriaScores - Criteria scores
	 * @returns {string} Confidence level
	 */
	calculateConfidenceLevel(criteriaScores) {
		const scores = Object.values(criteriaScores);
		const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
		const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
		
		if (avgScore >= 80 && variance < 100) return 'high';
		if (avgScore >= 60 && variance < 200) return 'medium';
		return 'low';
	}

	/**
	 * Estimate effort needed for improvement
	 * @param {Object} criteriaScores - Criteria scores
	 * @returns {string} Effort estimate
	 */
	estimateImprovementEffort(criteriaScores) {
		const lowScores = Object.values(criteriaScores).filter(score => score < 60).length;
		
		if (lowScores >= 3) return 'high';
		if (lowScores >= 2) return 'medium';
		if (lowScores >= 1) return 'low';
		return 'minimal';
	}

	/**
	 * Identify priority areas for improvement
	 * @param {Object} criteriaScores - Criteria scores
	 * @returns {Array} Priority areas
	 */
	identifyPriorityAreas(criteriaScores) {
		return Object.entries(criteriaScores)
			.filter(([_, score]) => score < 70)
			.sort(([_, a], [__, b]) => a - b)
			.map(([criterion, _]) => criterion);
	}

	/**
	 * Count sections in PRD content
	 * @param {string} content - PRD content
	 * @returns {number} Section count
	 */
	countSections(content) {
		const headingMatches = content.match(/^#{1,3}\s+.+$/gm) || [];
		return headingMatches.length;
	}

	/**
	 * Count requirements in PRD content
	 * @param {string} content - PRD content
	 * @returns {number} Requirements count
	 */
	countRequirements(content) {
		// Count numbered lists and bullet points in requirements sections
		const reqSectionMatch = content.match(/requirements?[\s\S]*?(?=^#|\Z)/gmi);
		if (!reqSectionMatch) return 0;
		
		const reqText = reqSectionMatch.join(' ');
		const numberedItems = reqText.match(/^\s*\d+\./gm) || [];
		const bulletItems = reqText.match(/^\s*[-*]\s/gm) || [];
		
		return numberedItems.length + bulletItems.length;
	}
}
