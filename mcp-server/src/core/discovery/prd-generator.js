/**
 * mcp-server/src/core/discovery/prd-generator.js
 * Core PRD generation logic with template processing and content synthesis
 */

import fs from 'fs/promises';
import path from 'path';
import { 
	PRD_TEMPLATES, 
	selectPRDTemplate, 
	generateTemplatePlaceholders,
	PRDStructureSchema 
} from './prd-templates.js';
import {
	DISCOVERY_STAGES,
	DISCOVERY_DEFAULTS,
	PRD_QUALITY_THRESHOLDS
} from './constants.js';
import { calculatePRDQualityScore } from './utils.js';

export class PRDGenerator {
	constructor() {
		this.templates = PRD_TEMPLATES;
		this.defaultOutputPath = '.taskmaster/docs';
	}

	/**
	 * Generate PRD from discovery session data
	 * @param {Object} discoverySession - Complete discovery session data
	 * @param {Object} options - Generation options
	 * @returns {Promise<Object>} Generated PRD data and metadata
	 */
	async generatePRD(discoverySession, options = {}) {
		try {
			const {
				templateType = null,
				outputPath = null,
				includeResearchData = true,
				customSections = [],
				aiEnhancement = true
			} = options;

			// Validate discovery session completeness
			this.validateDiscoverySession(discoverySession);

			// Select appropriate template
			const template = this.selectTemplate(discoverySession, templateType);

			// Generate template placeholders from discovery data
			const placeholders = generateTemplatePlaceholders(discoverySession);

			// Generate PRD content
			const prdContent = await this.generateContent(
				template, 
				placeholders, 
				discoverySession,
				{ includeResearchData, customSections, aiEnhancement }
			);

			// Create PRD structure
			const prdStructure = this.createPRDStructure(
				discoverySession, 
				template, 
				prdContent
			);

			// Calculate quality score
			const qualityAssessment = calculatePRDQualityScore(
				prdContent.fullText, 
				discoverySession
			);

			// Save PRD to file if output path specified
			let filePath = null;
			if (outputPath) {
				filePath = await this.savePRD(
					prdContent.fullText, 
					discoverySession.projectName, 
					outputPath
				);
			}

			return {
				success: true,
				prd: {
					content: prdContent.fullText,
					structure: prdStructure,
					metadata: {
						projectName: discoverySession.projectName,
						template: template.name,
						generatedAt: new Date().toISOString(),
						discoverySessionId: discoverySession.sessionId,
						qualityScore: qualityAssessment.overallScore,
						filePath
					}
				},
				qualityAssessment,
				recommendations: this.generateRecommendations(qualityAssessment, discoverySession)
			};

		} catch (error) {
			return {
				success: false,
				error: {
					message: error.message,
					code: 'PRD_GENERATION_FAILED'
				}
			};
		}
	}

	/**
	 * Validate discovery session completeness
	 * @param {Object} discoverySession - Discovery session data
	 */
	validateDiscoverySession(discoverySession) {
		if (!discoverySession) {
			throw new Error('Discovery session data is required');
		}

		if (!discoverySession.projectName) {
			throw new Error('Project name is required');
		}

		// Check if requirements synthesis is complete
		const reqSynthesis = discoverySession.progress?.[DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS];
		if (!reqSynthesis || reqSynthesis.status !== 'completed') {
			throw new Error('Requirements synthesis must be completed before PRD generation');
		}

		// Validate minimum requirements
		const reqData = reqSynthesis.data;
		if (!reqData?.functionalRequirements || reqData.functionalRequirements.length < DISCOVERY_DEFAULTS.MIN_REQUIREMENTS_COUNT) {
			throw new Error(`Minimum ${DISCOVERY_DEFAULTS.MIN_REQUIREMENTS_COUNT} functional requirements required`);
		}
	}

	/**
	 * Select appropriate PRD template
	 * @param {Object} discoverySession - Discovery session data
	 * @param {string} templateType - Optional template type override
	 * @returns {Object} Selected template
	 */
	selectTemplate(discoverySession, templateType) {
		if (templateType && this.templates[templateType]) {
			return this.templates[templateType];
		}

		// Determine project characteristics for template selection
		const reqData = discoverySession.progress?.[DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS]?.data || {};
		const techData = discoverySession.progress?.[DISCOVERY_STAGES.TECHNICAL_FEASIBILITY]?.data || {};
		
		const projectData = {
			complexity: this.assessProjectComplexity(discoverySession),
			projectType: this.inferProjectType(discoverySession),
			requirementsCount: (reqData.functionalRequirements || []).length + (reqData.nonFunctionalRequirements || []).length,
			userPreference: discoverySession.metadata?.templatePreference
		};

		return selectPRDTemplate(projectData);
	}

	/**
	 * Generate PRD content from template and placeholders
	 * @param {Object} template - Selected template
	 * @param {Object} placeholders - Template placeholders
	 * @param {Object} discoverySession - Discovery session data
	 * @param {Object} options - Generation options
	 * @returns {Promise<Object>} Generated content
	 */
	async generateContent(template, placeholders, discoverySession, options) {
		const { includeResearchData, customSections, aiEnhancement } = options;

		// Process template sections
		const processedSections = template.sections.map(section => {
			let content = section.content;

			// Replace placeholders
			Object.entries(placeholders).forEach(([key, value]) => {
				const placeholder = `{${key}}`;
				content = content.replace(new RegExp(placeholder, 'g'), value || `[${key} to be defined]`);
			});

			return {
				...section,
				content: content.trim()
			};
		});

		// Add custom sections if provided
		if (customSections && customSections.length > 0) {
			processedSections.push(...customSections);
		}

		// Add research appendix if requested
		if (includeResearchData && discoverySession.researchData) {
			const researchSection = this.generateResearchAppendix(discoverySession.researchData);
			processedSections.push(researchSection);
		}

		// Sort sections by order
		processedSections.sort((a, b) => a.order - b.order);

		// Generate full text
		const fullText = this.assemblePRDText(processedSections, discoverySession);

		return {
			sections: processedSections,
			fullText,
			wordCount: fullText.split(/\s+/).length,
			sectionCount: processedSections.length
		};
	}

	/**
	 * Create structured PRD object
	 * @param {Object} discoverySession - Discovery session data
	 * @param {Object} template - Used template
	 * @param {Object} content - Generated content
	 * @returns {Object} PRD structure
	 */
	createPRDStructure(discoverySession, template, content) {
		const reqData = discoverySession.progress?.[DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS]?.data || {};
		const techData = discoverySession.progress?.[DISCOVERY_STAGES.TECHNICAL_FEASIBILITY]?.data || {};
		const marketData = discoverySession.progress?.[DISCOVERY_STAGES.MARKET_RESEARCH]?.data || {};

		const structure = {
			metadata: {
				title: `${discoverySession.projectName} - Product Requirements Document`,
				version: '1.0',
				author: 'AI-Generated via Discovery Workflow',
				createdAt: new Date().toISOString(),
				lastUpdated: new Date().toISOString(),
				projectType: this.inferProjectType(discoverySession),
				estimatedComplexity: this.assessProjectComplexity(discoverySession),
				targetAudience: reqData.targetUsers || [],
				businessGoals: discoverySession.metadata?.userPreferences?.businessGoals || []
			},
			sections: content.sections,
			requirements: {
				functional: reqData.functionalRequirements || [],
				nonFunctional: this.transformNonFunctionalRequirements(reqData.nonFunctionalRequirements || [])
			},
			technicalSpecs: {
				architecture: techData.architecture || 'Architecture to be defined',
				techStack: techData.technologies || discoverySession.metadata?.userPreferences?.techStack || [],
				integrations: techData.integrations || [],
				constraints: discoverySession.metadata?.userPreferences?.constraints || [],
				scalabilityConsiderations: techData.scalabilityConsiderations
			},
			marketContext: {
				targetMarket: marketData.targetMarket || 'Target market analysis pending',
				competitiveAnalysis: marketData.competitiveAnalysis || 'Competitive analysis needed',
				marketOpportunity: marketData.marketOpportunity || 'Market opportunity assessment required',
				riskFactors: marketData.riskFactors || []
			}
		};

		// Validate structure against schema
		return PRDStructureSchema.parse(structure);
	}

	/**
	 * Transform non-functional requirements from session format to PRD structure format
	 * @param {Array} sessionNFRs - Non-functional requirements from session data
	 * @returns {Array} Transformed non-functional requirements for PRD structure
	 */
	transformNonFunctionalRequirements(sessionNFRs) {
		return sessionNFRs.map(nfr => ({
			id: nfr.id,
			category: this.capitalizeNFRType(nfr.type || 'Performance'),
			description: nfr.description,
			priority: 'medium', // Default priority since session data doesn't include it
			acceptanceCriteria: nfr.criteria
		}));
	}

	/**
	 * Capitalize NFR type to match PRD structure schema
	 * @param {string} type - NFR type from session data (lowercase)
	 * @returns {string} Capitalized type for PRD structure
	 */
	capitalizeNFRType(type) {
		const typeMap = {
			'performance': 'Performance',
			'security': 'Security',
			'usability': 'Usability',
			'reliability': 'Reliability',
			'scalability': 'Scalability',
			'maintainability': 'Maintainability'
		};
		return typeMap[type.toLowerCase()] || 'Performance';
	}

	/**
	 * Assess project complexity based on discovery data
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {string} Complexity level
	 */
	assessProjectComplexity(discoverySession) {
		const reqData = discoverySession.progress?.[DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS]?.data || {};
		const techData = discoverySession.progress?.[DISCOVERY_STAGES.TECHNICAL_FEASIBILITY]?.data || {};

		const functionalCount = (reqData.functionalRequirements || []).length;
		const nonFunctionalCount = (reqData.nonFunctionalRequirements || []).length;
		const techStackSize = (techData.technologies || []).length;

		// Complexity scoring
		let complexityScore = 0;
		if (functionalCount > 15) complexityScore += 3;
		else if (functionalCount > 8) complexityScore += 2;
		else if (functionalCount > 3) complexityScore += 1;

		if (nonFunctionalCount > 8) complexityScore += 2;
		else if (nonFunctionalCount > 4) complexityScore += 1;

		if (techStackSize > 8) complexityScore += 2;
		else if (techStackSize > 4) complexityScore += 1;

		// Determine complexity level
		if (complexityScore >= 6) return 'enterprise';
		if (complexityScore >= 4) return 'high';
		if (complexityScore >= 2) return 'medium';
		return 'low';
	}

	/**
	 * Infer project type from discovery data
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {string} Project type
	 */
	inferProjectType(discoverySession) {
		const projectName = discoverySession.projectName.toLowerCase();
		const techStack = discoverySession.metadata?.userPreferences?.techStack || [];
		const techStackStr = techStack.join(' ').toLowerCase();

		// Pattern matching for project type
		if (projectName.includes('api') || techStackStr.includes('api')) return 'api service';
		if (projectName.includes('mobile') || techStackStr.includes('react native') || techStackStr.includes('flutter')) return 'mobile app';
		if (techStackStr.includes('microservice') || techStackStr.includes('docker')) return 'microservice';
		if (techStackStr.includes('library') || techStackStr.includes('package')) return 'library';
		if (projectName.includes('tool') || projectName.includes('utility')) return 'tool';
		if (projectName.includes('prototype') || projectName.includes('poc')) return 'prototype';
		
		return 'web application'; // Default
	}

	/**
	 * Generate research data appendix
	 * @param {Object} researchData - Research data from discovery
	 * @returns {Object} Research appendix section
	 */
	generateResearchAppendix(researchData) {
		const sections = [];

		if (researchData.marketAnalysis?.length > 0) {
			sections.push('### Market Research\n' + 
				researchData.marketAnalysis.map(r => `- ${r.query}: ${r.results?.summary || 'Analysis completed'}`).join('\n'));
		}

		if (researchData.technicalValidation?.length > 0) {
			sections.push('### Technical Validation\n' + 
				researchData.technicalValidation.map(r => `- ${r.technology || r.query}: ${r.validation?.summary || 'Validated'}`).join('\n'));
		}

		if (researchData.competitiveAnalysis?.length > 0) {
			sections.push('### Competitive Analysis\n' + 
				researchData.competitiveAnalysis.map(r => `- ${r.query}: ${r.results?.summary || 'Analysis completed'}`).join('\n'));
		}

		return {
			title: 'Research Appendix',
			content: `## Research Appendix\n\n${sections.join('\n\n')}`,
			required: false,
			order: 999
		};
	}

	/**
	 * Assemble final PRD text
	 * @param {Array} sections - Processed sections
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {string} Complete PRD text
	 */
	assemblePRDText(sections, discoverySession) {
		const header = `# ${discoverySession.projectName} - Product Requirements Document

**Generated**: ${new Date().toISOString().split('T')[0]}
**Version**: 1.0
**Discovery Session**: ${discoverySession.sessionId}

---

`;

		const sectionTexts = sections.map(section => section.content).join('\n\n---\n\n');
		
		const footer = `

---

*This PRD was generated using the Task Master AI-guided discovery workflow. All requirements and specifications are based on comprehensive market research, technical feasibility analysis, and structured requirements synthesis.*`;

		return header + sectionTexts + footer;
	}

	/**
	 * Save PRD to file
	 * @param {string} content - PRD content
	 * @param {string} projectName - Project name
	 * @param {string} outputPath - Output directory path
	 * @returns {Promise<string>} File path
	 */
	async savePRD(content, projectName, outputPath) {
		try {
			// Ensure output directory exists
			await fs.mkdir(outputPath, { recursive: true });

			// Generate filename
			const timestamp = new Date().toISOString().split('T')[0];
			const filename = `${projectName.toLowerCase().replace(/\s+/g, '-')}-prd-${timestamp}.md`;
			const filePath = path.join(outputPath, filename);

			// Write file
			await fs.writeFile(filePath, content, 'utf-8');

			return filePath;
		} catch (error) {
			throw new Error(`Failed to save PRD: ${error.message}`);
		}
	}

	/**
	 * Generate recommendations based on quality assessment
	 * @param {Object} qualityAssessment - Quality assessment results
	 * @param {Object} discoverySession - Discovery session data
	 * @returns {Array} Recommendations
	 */
	generateRecommendations(qualityAssessment, discoverySession) {
		const recommendations = [...qualityAssessment.recommendations];

		// Add specific recommendations based on discovery data
		const reqData = discoverySession.progress?.[DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS]?.data || {};
		
		if ((reqData.functionalRequirements || []).length < 5) {
			recommendations.push('Consider adding more detailed functional requirements');
		}

		if ((reqData.nonFunctionalRequirements || []).length < 3) {
			recommendations.push('Add non-functional requirements for performance, security, and usability');
		}

		if (qualityAssessment.overallScore < PRD_QUALITY_THRESHOLDS.GOOD) {
			recommendations.push('PRD quality is below recommended threshold - consider additional discovery research');
		}

		return recommendations;
	}
}
