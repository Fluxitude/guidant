/**
 * mcp-server/src/core/discovery/prd-templates.js
 * PRD templates and schemas for consistent output format
 */

import { z } from 'zod';
import { 
	PRD_QUALITY_CRITERIA, 
	PRD_QUALITY_THRESHOLDS,
	DISCOVERY_DEFAULTS 
} from './constants.js';

// PRD section schemas
export const PRDSectionSchema = z.object({
	title: z.string(),
	content: z.string(),
	required: z.boolean().default(true),
	order: z.number().int().positive()
});

// Complete PRD structure schema
export const PRDStructureSchema = z.object({
	metadata: z.object({
		title: z.string(),
		version: z.string().default('1.0'),
		author: z.string().default('AI-Generated'),
		createdAt: z.string().datetime(),
		lastUpdated: z.string().datetime(),
		projectType: z.string(),
		estimatedComplexity: z.enum(['low', 'medium', 'high', 'enterprise']),
		targetAudience: z.array(z.string()),
		businessGoals: z.array(z.string())
	}),
	sections: z.array(PRDSectionSchema),
	requirements: z.object({
		functional: z.array(z.object({
			id: z.string(),
			title: z.string(),
			description: z.string(),
			priority: z.enum(['high', 'medium', 'low']),
			userStory: z.string().optional(),
			acceptanceCriteria: z.array(z.string()).default([])
		})),
		nonFunctional: z.array(z.object({
			id: z.string(),
			category: z.enum(['Performance', 'Security', 'Usability', 'Reliability', 'Scalability', 'Maintainability']),
			description: z.string(),
			priority: z.enum(['high', 'medium', 'low']),
			acceptanceCriteria: z.string().optional()
		}))
	}),
	technicalSpecs: z.object({
		architecture: z.string(),
		techStack: z.array(z.string()),
		integrations: z.array(z.string()).default([]),
		constraints: z.array(z.string()).default([]),
		scalabilityConsiderations: z.string().optional()
	}),
	marketContext: z.object({
		targetMarket: z.string(),
		competitiveAnalysis: z.string(),
		marketOpportunity: z.string(),
		riskFactors: z.array(z.string()).default([])
	})
});

// PRD template definitions
export const PRD_TEMPLATES = {
	COMPREHENSIVE: {
		name: 'Comprehensive PRD',
		description: 'Full-featured PRD with all sections',
		sections: [
			{
				title: 'Executive Summary',
				content: `## Executive Summary

### Project Overview
{projectOverview}

### Business Objectives
{businessObjectives}

### Success Metrics
{successMetrics}

### Timeline and Resources
{timelineResources}`,
				required: true,
				order: 1
			},
			{
				title: 'Problem Statement',
				content: `## Problem Statement

### Current State
{currentState}

### Problem Definition
{problemDefinition}

### Target Users
{targetUsers}

### Pain Points
{painPoints}`,
				required: true,
				order: 2
			},
			{
				title: 'Solution Overview',
				content: `## Solution Overview

### Proposed Solution
{proposedSolution}

### Key Features
{keyFeatures}

### Value Proposition
{valueProposition}

### Differentiation
{differentiation}`,
				required: true,
				order: 3
			},
			{
				title: 'Market Analysis',
				content: `## Market Analysis

### Target Market
{targetMarket}

### Market Size and Opportunity
{marketOpportunity}

### Competitive Landscape
{competitiveAnalysis}

### Market Positioning
{marketPositioning}`,
				required: true,
				order: 4
			},
			{
				title: 'Functional Requirements',
				content: `## Functional Requirements

{functionalRequirements}`,
				required: true,
				order: 5
			},
			{
				title: 'Non-Functional Requirements',
				content: `## Non-Functional Requirements

{nonFunctionalRequirements}`,
				required: true,
				order: 6
			},
			{
				title: 'Technical Specifications',
				content: `## Technical Specifications

### Architecture Overview
{architectureOverview}

### Technology Stack
{technologyStack}

### System Integrations
{systemIntegrations}

### Technical Constraints
{technicalConstraints}

### Scalability Considerations
{scalabilityConsiderations}`,
				required: true,
				order: 7
			},
			{
				title: 'User Experience',
				content: `## User Experience

### User Journey
{userJourney}

### Interface Requirements
{interfaceRequirements}

### Accessibility Requirements
{accessibilityRequirements}

### Mobile Considerations
{mobileConsiderations}`,
				required: false,
				order: 8
			},
			{
				title: 'Implementation Plan',
				content: `## Implementation Plan

### Development Phases
{developmentPhases}

### Milestones and Deliverables
{milestonesDeliverables}

### Resource Requirements
{resourceRequirements}

### Risk Assessment
{riskAssessment}`,
				required: false,
				order: 9
			},
			{
				title: 'Success Criteria',
				content: `## Success Criteria

### Key Performance Indicators
{keyPerformanceIndicators}

### Acceptance Criteria
{acceptanceCriteria}

### Testing Strategy
{testingStrategy}

### Launch Criteria
{launchCriteria}`,
				required: true,
				order: 10
			}
		]
	},

	MINIMAL: {
		name: 'Minimal PRD',
		description: 'Essential sections only',
		sections: [
			{
				title: 'Overview',
				content: `## Project Overview

{projectOverview}

## Problem Statement

{problemStatement}

## Solution

{proposedSolution}`,
				required: true,
				order: 1
			},
			{
				title: 'Requirements',
				content: `## Requirements

### Functional Requirements
{functionalRequirements}

### Non-Functional Requirements
{nonFunctionalRequirements}`,
				required: true,
				order: 2
			},
			{
				title: 'Technical Specifications',
				content: `## Technical Specifications

{technicalSpecs}`,
				required: true,
				order: 3
			}
		]
	},

	TECHNICAL_FOCUSED: {
		name: 'Technical-Focused PRD',
		description: 'Emphasis on technical specifications and architecture',
		sections: [
			{
				title: 'Technical Overview',
				content: `## Technical Overview

{technicalOverview}

## Architecture Design

{architectureDesign}

## Technology Stack

{technologyStack}`,
				required: true,
				order: 1
			},
			{
				title: 'System Requirements',
				content: `## System Requirements

### Functional Requirements
{functionalRequirements}

### Performance Requirements
{performanceRequirements}

### Security Requirements
{securityRequirements}`,
				required: true,
				order: 2
			},
			{
				title: 'Implementation Details',
				content: `## Implementation Details

{implementationDetails}

## Integration Requirements

{integrationRequirements}

## Deployment Strategy

{deploymentStrategy}`,
				required: true,
				order: 3
			}
		]
	}
};

// Template selection criteria
export const TEMPLATE_SELECTION_CRITERIA = {
	projectComplexity: {
		low: 'MINIMAL',
		medium: 'COMPREHENSIVE',
		high: 'COMPREHENSIVE',
		enterprise: 'COMPREHENSIVE'
	},
	projectType: {
		'web application': 'COMPREHENSIVE',
		'mobile app': 'COMPREHENSIVE',
		'api service': 'TECHNICAL_FOCUSED',
		'microservice': 'TECHNICAL_FOCUSED',
		'library': 'TECHNICAL_FOCUSED',
		'tool': 'MINIMAL',
		'prototype': 'MINIMAL'
	},
	requirementsCount: {
		minimal: 'MINIMAL',      // < 5 requirements
		standard: 'COMPREHENSIVE', // 5-15 requirements
		extensive: 'COMPREHENSIVE' // > 15 requirements
	}
};

/**
 * Select appropriate PRD template based on project characteristics
 * @param {Object} projectData - Project characteristics
 * @returns {Object} Selected template
 */
export function selectPRDTemplate(projectData) {
	const {
		complexity = 'medium',
		projectType = 'web application',
		requirementsCount = 0,
		userPreference = null
	} = projectData;

	// User preference overrides automatic selection
	if (userPreference && PRD_TEMPLATES[userPreference]) {
		return PRD_TEMPLATES[userPreference];
	}

	// Determine requirements category
	let reqCategory = 'standard';
	if (requirementsCount < 5) reqCategory = 'minimal';
	else if (requirementsCount > 15) reqCategory = 'extensive';

	// Apply selection criteria in order of priority
	let selectedTemplate = 'COMPREHENSIVE'; // Default

	// Check project type first
	if (TEMPLATE_SELECTION_CRITERIA.projectType[projectType]) {
		selectedTemplate = TEMPLATE_SELECTION_CRITERIA.projectType[projectType];
	}

	// Override with complexity if it suggests a different template
	if (TEMPLATE_SELECTION_CRITERIA.projectComplexity[complexity] === 'MINIMAL') {
		selectedTemplate = 'MINIMAL';
	}

	// Override with requirements count if minimal
	if (TEMPLATE_SELECTION_CRITERIA.requirementsCount[reqCategory] === 'MINIMAL') {
		selectedTemplate = 'MINIMAL';
	}

	return PRD_TEMPLATES[selectedTemplate];
}

/**
 * Generate template placeholders for content substitution
 * @param {Object} discoveryData - Discovery session data
 * @returns {Object} Template placeholders
 */
export function generateTemplatePlaceholders(discoveryData) {
	const {
		projectName,
		metadata = {},
		progress = {},
		researchData = {}
	} = discoveryData;

	// Extract data from discovery stages
	const problemData = progress['problem-discovery']?.data || {};
	const marketData = progress['market-research']?.data || {};
	const technicalData = progress['technical-feasibility']?.data || {};
	const requirementsData = progress['requirements-synthesis']?.data || {};

	return {
		// Basic project info
		projectOverview: `${projectName} - ${problemData.problemStatement || 'AI-generated project solution'}`,
		projectName,
		
		// Problem and solution
		problemStatement: problemData.problemStatement || 'Problem statement to be defined',
		currentState: problemData.currentState || 'Current state analysis pending',
		problemDefinition: problemData.problemStatement || 'Detailed problem definition needed',
		proposedSolution: problemData.proposedSolution || 'Solution approach to be defined',
		
		// Business context
		businessObjectives: (metadata.userPreferences?.businessGoals || []).join('\n- ') || 'Business objectives to be defined',
		targetUsers: (requirementsData.targetUsers || problemData.targetUsers || metadata.userPreferences?.targetAudience || ['General users']).join(', '),
		valueProposition: problemData.valueProposition || 'Value proposition to be defined',
		
		// Market analysis
		targetMarket: marketData.targetMarket || 'Target market analysis pending',
		marketOpportunity: marketData.marketOpportunity || 'Market opportunity assessment needed',
		competitiveAnalysis: marketData.competitiveAnalysis || 'Competitive analysis to be conducted',
		
		// Technical specifications
		technologyStack: (technicalData.technologies || metadata.userPreferences?.techStack || []).join(', '),
		architectureOverview: technicalData.architecture || 'Architecture design pending',
		technicalConstraints: (metadata.userPreferences?.constraints || []).join('\n- ') || 'No specific constraints identified',
		
		// Requirements
		functionalRequirements: formatRequirements(requirementsData.functionalRequirements || []),
		nonFunctionalRequirements: formatRequirements(requirementsData.nonFunctionalRequirements || []),
		
		// Success metrics
		successMetrics: (problemData.successCriteria || []).join('\n- ') || 'Success metrics to be defined',
		keyPerformanceIndicators: (problemData.successCriteria || []).join('\n- ') || 'KPIs to be established'
	};
}

/**
 * Format requirements for PRD template
 * @param {Array} requirements - Requirements array
 * @returns {string} Formatted requirements text
 */
function formatRequirements(requirements) {
	if (!requirements || requirements.length === 0) {
		return 'Requirements to be defined based on discovery findings';
	}

	return requirements.map((req, index) => {
		const priority = req.priority ? ` (${req.priority.toUpperCase()} priority)` : '';
		const userStory = req.userStory ? `\n   User Story: ${req.userStory}` : '';
		const acceptanceCriteria = req.acceptanceCriteria && req.acceptanceCriteria.length > 0 
			? `\n   Acceptance Criteria: ${req.acceptanceCriteria.join(', ')}` 
			: '';
		
		return `${index + 1}. **${req.title || req.id}**${priority}
   ${req.description}${userStory}${acceptanceCriteria}`;
	}).join('\n\n');
}
