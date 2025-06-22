/**
 * mcp-server/src/core/discovery/state-schema.js
 * Schema definitions for discovery session state management
 */

import { z } from 'zod';
import {
	DISCOVERY_STAGES,
	DISCOVERY_SESSION_STATUS,
	STAGE_STATUS,
	RESEARCH_PROVIDERS,
	RESEARCH_QUERY_TYPES,
	PRD_QUALITY_CRITERIA,
	VALIDATION_RULES
} from './constants.js';

// Base validation schemas
const ProjectNameSchema = z
	.string()
	.min(VALIDATION_RULES.PROJECT_NAME.MIN_LENGTH)
	.max(VALIDATION_RULES.PROJECT_NAME.MAX_LENGTH)
	.regex(VALIDATION_RULES.PROJECT_NAME.PATTERN);

const ProblemStatementSchema = z
	.string()
	.min(VALIDATION_RULES.PROBLEM_STATEMENT.MIN_LENGTH)
	.max(VALIDATION_RULES.PROBLEM_STATEMENT.MAX_LENGTH);

const RequirementSchema = z
	.string()
	.min(VALIDATION_RULES.REQUIREMENT.MIN_LENGTH)
	.max(VALIDATION_RULES.REQUIREMENT.MAX_LENGTH);

// Research data schemas
const ResearchQuerySchema = z.object({
	query: z
		.string()
		.min(VALIDATION_RULES.RESEARCH_QUERY.MIN_LENGTH)
		.max(VALIDATION_RULES.RESEARCH_QUERY.MAX_LENGTH),
	provider: z.enum([
		RESEARCH_PROVIDERS.CONTEXT7,
		RESEARCH_PROVIDERS.TAVILY,
		RESEARCH_PROVIDERS.PERPLEXITY
	]),
	queryType: z.enum([
		RESEARCH_QUERY_TYPES.TECHNICAL,
		RESEARCH_QUERY_TYPES.MARKET,
		RESEARCH_QUERY_TYPES.COMPETITIVE,
		RESEARCH_QUERY_TYPES.GENERAL,
		RESEARCH_QUERY_TYPES.HYBRID
	]),
	timestamp: z.string().datetime(),
	results: z.any().optional(),
	success: z.boolean(),
	errorMessage: z.string().optional()
});

const ResearchDataSchema = z.object({
	marketAnalysis: z.array(ResearchQuerySchema).default([]),
	technicalValidation: z.array(ResearchQuerySchema).default([]),
	competitiveAnalysis: z.array(ResearchQuerySchema).default([]),
	generalResearch: z.array(ResearchQuerySchema).default([])
});

// Stage progress schemas
const StageProgressSchema = z.object({
	status: z.enum([
		STAGE_STATUS.NOT_STARTED,
		STAGE_STATUS.IN_PROGRESS,
		STAGE_STATUS.COMPLETED,
		STAGE_STATUS.SKIPPED
	]),
	completionScore: z.number().min(0).max(100).optional(),
	startedAt: z.string().datetime().optional(),
	completedAt: z.string().datetime().optional(),
	data: z.record(z.any()).default({})
});

// Problem discovery stage data
const ProblemDiscoveryDataSchema = z.object({
	problemStatement: z.string().optional(),
	targetAudience: z.string().optional(),
	successCriteria: z.array(z.string()).default([]),
	constraints: z.array(z.string()).default([]),
	assumptions: z.array(z.string()).default([]),
	stakeholders: z.array(z.string()).default([])
});

// Market research stage data
const MarketResearchDataSchema = z.object({
	competitorAnalysis: z.array(z.object({
		name: z.string(),
		description: z.string(),
		strengths: z.array(z.string()).default([]),
		weaknesses: z.array(z.string()).default([]),
		marketShare: z.string().optional()
	})).default([]),
	marketSize: z.string().optional(),
	opportunities: z.array(z.string()).default([]),
	threats: z.array(z.string()).default([]),
	targetMarket: z.string().optional(),
	userPersonas: z.array(z.object({
		name: z.string(),
		description: z.string(),
		needs: z.array(z.string()).default([]),
		painPoints: z.array(z.string()).default([])
	})).default([])
});

// Technical feasibility stage data
const TechnicalFeasibilityDataSchema = z.object({
	recommendedTechStack: z.object({
		frontend: z.array(z.string()).default([]),
		backend: z.array(z.string()).default([]),
		database: z.array(z.string()).default([]),
		infrastructure: z.array(z.string()).default([]),
		thirdParty: z.array(z.string()).default([])
	}).optional(),
	architecture: z.object({
		pattern: z.string().optional(),
		components: z.array(z.string()).default([]),
		dataFlow: z.string().optional()
	}).optional(),
	complexityAssessment: z.object({
		overall: z.enum(['low', 'medium', 'high']).optional(),
		frontend: z.enum(['low', 'medium', 'high']).optional(),
		backend: z.enum(['low', 'medium', 'high']).optional(),
		integration: z.enum(['low', 'medium', 'high']).optional()
	}).optional(),
	estimatedTimeline: z.string().optional(),
	risks: z.array(z.string()).default([]),
	mitigations: z.array(z.string()).default([])
});

// Requirements synthesis stage data
const RequirementsSynthesisDataSchema = z.object({
	functionalRequirements: z.array(z.object({
		id: z.string(),
		title: z.string(),
		description: z.string(),
		priority: z.enum(['high', 'medium', 'low']),
		category: z.string().optional()
	})).default([]),
	nonFunctionalRequirements: z.array(z.object({
		id: z.string(),
		title: z.string(),
		description: z.string(),
		type: z.enum(['performance', 'security', 'usability', 'reliability', 'scalability']),
		criteria: z.string().optional()
	})).default([]),
	userStories: z.array(z.object({
		id: z.string(),
		title: z.string(),
		description: z.string(),
		acceptanceCriteria: z.array(z.string()).default([]),
		priority: z.enum(['high', 'medium', 'low'])
	})).default([]),
	dependencies: z.array(z.object({
		from: z.string(),
		to: z.string(),
		type: z.enum(['blocks', 'depends-on', 'related'])
	})).default([])
});

// PRD generation stage data
const PRDGenerationDataSchema = z.object({
	prdContent: z.string().optional(),
	qualityAssessment: z.object({
		overallScore: z.number().min(0).max(100).optional(),
		criteria: z.record(z.enum([
			PRD_QUALITY_CRITERIA.COMPLETENESS,
			PRD_QUALITY_CRITERIA.CLARITY,
			PRD_QUALITY_CRITERIA.TECHNICAL_FEASIBILITY,
			PRD_QUALITY_CRITERIA.MARKET_VALIDATION,
			PRD_QUALITY_CRITERIA.REQUIREMENTS_COVERAGE
		]), z.number().min(0).max(100)).optional(),
		recommendations: z.array(z.string()).default([]),
		gaps: z.array(z.string()).default([])
	}).optional(),
	prdFilePath: z.string().optional(),
	generatedAt: z.string().datetime().optional()
});

// Complete discovery session progress schema
const DiscoveryProgressSchema = z.object({
	[DISCOVERY_STAGES.PROBLEM_DISCOVERY]: StageProgressSchema.extend({
		data: ProblemDiscoveryDataSchema.optional()
	}),
	[DISCOVERY_STAGES.MARKET_RESEARCH]: StageProgressSchema.extend({
		data: MarketResearchDataSchema.optional()
	}),
	[DISCOVERY_STAGES.TECHNICAL_FEASIBILITY]: StageProgressSchema.extend({
		data: TechnicalFeasibilityDataSchema.optional()
	}),
	[DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS]: StageProgressSchema.extend({
		data: RequirementsSynthesisDataSchema.optional()
	}),
	[DISCOVERY_STAGES.PRD_GENERATION]: StageProgressSchema.extend({
		data: PRDGenerationDataSchema.optional()
	})
});

// Main discovery session schema
export const DiscoverySessionSchema = z.object({
	sessionId: z.string().uuid(),
	projectName: ProjectNameSchema,
	stage: z.enum([
		DISCOVERY_STAGES.PROBLEM_DISCOVERY,
		DISCOVERY_STAGES.MARKET_RESEARCH,
		DISCOVERY_STAGES.TECHNICAL_FEASIBILITY,
		DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS,
		DISCOVERY_STAGES.PRD_GENERATION
	]),
	status: z.enum([
		DISCOVERY_SESSION_STATUS.ACTIVE,
		DISCOVERY_SESSION_STATUS.PAUSED,
		DISCOVERY_SESSION_STATUS.COMPLETED,
		DISCOVERY_SESSION_STATUS.CANCELLED
	]),
	progress: DiscoveryProgressSchema,
	created: z.string().datetime(),
	lastUpdated: z.string().datetime(),
	researchData: ResearchDataSchema,
	metadata: z.object({
		userPreferences: z.record(z.any()).default({}),
		techStackPreferences: z.array(z.string()).default([]),
		inspirationReferences: z.array(z.string()).default([]),
		constraints: z.array(z.string()).default([])
	}).optional()
});

// Extended state.json schema that includes discovery session
export const ExtendedStateSchema = z.object({
	// Existing Task Master state fields
	currentTag: z.string().default('master'),
	lastSwitched: z.string().datetime(),
	branchTagMapping: z.record(z.string()).default({}),
	migrationNoticeShown: z.boolean().default(false),
	
	// New discovery session field
	discoverySession: DiscoverySessionSchema.optional()
});

// Export individual schemas for validation
export {
	ProjectNameSchema,
	ProblemStatementSchema,
	RequirementSchema,
	ResearchQuerySchema,
	ResearchDataSchema,
	StageProgressSchema,
	ProblemDiscoveryDataSchema,
	MarketResearchDataSchema,
	TechnicalFeasibilityDataSchema,
	RequirementsSynthesisDataSchema,
	PRDGenerationDataSchema,
	DiscoveryProgressSchema
};
