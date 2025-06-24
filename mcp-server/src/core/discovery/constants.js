/**
 * mcp-server/src/core/discovery/constants.js
 * Constants and enums for the Pre-PRD Discovery Phase system
 */

// Discovery workflow stages
export const DISCOVERY_STAGES = {
	PROBLEM_DISCOVERY: 'problem-discovery',
	MARKET_RESEARCH: 'market-research',
	TECHNICAL_FEASIBILITY: 'technical-feasibility',
	REQUIREMENTS_SYNTHESIS: 'requirements-synthesis',
	PRD_GENERATION: 'prd-generation'
};

// Discovery stage display names
export const DISCOVERY_STAGE_NAMES = {
	[DISCOVERY_STAGES.PROBLEM_DISCOVERY]: 'Problem Discovery',
	[DISCOVERY_STAGES.MARKET_RESEARCH]: 'Market Research',
	[DISCOVERY_STAGES.TECHNICAL_FEASIBILITY]: 'Technical Feasibility',
	[DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS]: 'Requirements Synthesis',
	[DISCOVERY_STAGES.PRD_GENERATION]: 'PRD Generation'
};

// Discovery stage order for workflow progression
export const DISCOVERY_STAGE_ORDER = [
	DISCOVERY_STAGES.PROBLEM_DISCOVERY,
	DISCOVERY_STAGES.MARKET_RESEARCH,
	DISCOVERY_STAGES.TECHNICAL_FEASIBILITY,
	DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS,
	DISCOVERY_STAGES.PRD_GENERATION
];

// Discovery session status
export const DISCOVERY_SESSION_STATUS = {
	ACTIVE: 'active',
	PAUSED: 'paused',
	COMPLETED: 'completed',
	CANCELLED: 'cancelled'
};

// Discovery stage completion status
export const STAGE_STATUS = {
	NOT_STARTED: 'not-started',
	IN_PROGRESS: 'in-progress',
	COMPLETED: 'completed',
	SKIPPED: 'skipped'
};

// Research provider types for intelligent routing
export const RESEARCH_PROVIDERS = {
	CONTEXT7: 'context7',
	TAVILY: 'tavily',
	PERPLEXITY: 'perplexity'
};

// Research query types for provider routing
export const RESEARCH_QUERY_TYPES = {
	TECHNICAL: 'technical',
	MARKET: 'market',
	COMPETITIVE: 'competitive',
	GENERAL: 'general',
	HYBRID: 'hybrid'
};

// PRD quality validation criteria
export const PRD_QUALITY_CRITERIA = {
	COMPLETENESS: 'completeness',
	CLARITY: 'clarity',
	TECHNICAL_FEASIBILITY: 'technical-feasibility',
	MARKET_VALIDATION: 'market-validation',
	REQUIREMENTS_COVERAGE: 'requirements-coverage'
};

// PRD quality scoring thresholds
export const PRD_QUALITY_THRESHOLDS = {
	EXCELLENT: 90,
	GOOD: 75,
	ACCEPTABLE: 60,
	NEEDS_IMPROVEMENT: 40,
	POOR: 0
};

// Discovery session configuration defaults
export const DISCOVERY_DEFAULTS = {
	SESSION_TIMEOUT_HOURS: 24,
	MAX_RESEARCH_QUERIES_PER_STAGE: 5,
	MIN_REQUIREMENTS_COUNT: 3,
	MAX_REQUIREMENTS_COUNT: 20,
	PRD_MIN_QUALITY_SCORE: 60
};

// Discovery data validation rules
export const VALIDATION_RULES = {
	PROJECT_NAME: {
		MIN_LENGTH: 2,
		MAX_LENGTH: 100,
		PATTERN: /^[a-zA-Z0-9\s\-_]+$/
	},
	PROBLEM_STATEMENT: {
		MIN_LENGTH: 10,
		MAX_LENGTH: 1000
	},
	REQUIREMENT: {
		MIN_LENGTH: 5,
		MAX_LENGTH: 500
	},
	RESEARCH_QUERY: {
		MIN_LENGTH: 3,
		MAX_LENGTH: 200
	}
};

// Discovery session state schema keys
export const SESSION_STATE_KEYS = {
	SESSION_ID: 'sessionId',
	PROJECT_NAME: 'projectName',
	STAGE: 'stage',
	STATUS: 'status',
	PROGRESS: 'progress',
	CREATED: 'created',
	LAST_UPDATED: 'lastUpdated',
	RESEARCH_DATA: 'researchData',
	REQUIREMENTS: 'requirements',
	PRD_DATA: 'prdData'
};

// Error codes for discovery system
export const DISCOVERY_ERROR_CODES = {
	SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
	INVALID_STAGE: 'INVALID_STAGE',
	VALIDATION_FAILED: 'VALIDATION_FAILED',
	RESEARCH_FAILED: 'RESEARCH_FAILED',
	PRD_GENERATION_FAILED: 'PRD_GENERATION_FAILED',
	QUALITY_ASSESSMENT_FAILED: 'QUALITY_ASSESSMENT_FAILED',
	SESSION_EXPIRED: 'SESSION_EXPIRED',
	STAGE_NOT_READY: 'STAGE_NOT_READY'
};

// Discovery workflow messages
export const DISCOVERY_MESSAGES = {
	SESSION_CREATED: 'Discovery session created successfully',
	SESSION_RESUMED: 'Discovery session resumed',
	STAGE_COMPLETED: 'Stage completed successfully',
	RESEARCH_COMPLETED: 'Research completed',
	PRD_GENERATED: 'PRD generated successfully',
	QUALITY_VALIDATED: 'PRD quality validated',
	SESSION_COMPLETED: 'Discovery session completed'
};

// Research provider routing patterns
export const RESEARCH_ROUTING_PATTERNS = {
	TECHNICAL_KEYWORDS: [
		'framework', 'library', 'api', 'database', 'architecture',
		'implementation', 'code', 'development', 'programming',
		'technology', 'stack', 'platform', 'infrastructure',
		'performance', 'optimization', 'security', 'testing'
	],
	MARKET_KEYWORDS: [
		'market', 'competitor', 'business', 'revenue', 'customer',
		'user', 'pricing', 'monetization', 'industry', 'trend',
		'analysis', 'opportunity', 'demand', 'segment'
	]
};

// Discovery stage requirements
export const STAGE_REQUIREMENTS = {
	[DISCOVERY_STAGES.PROBLEM_DISCOVERY]: {
		REQUIRED_FIELDS: ['problemStatement', 'targetAudience', 'successCriteria'],
		MIN_COMPLETION_SCORE: 70
	},
	[DISCOVERY_STAGES.MARKET_RESEARCH]: {
		REQUIRED_FIELDS: ['competitorAnalysis', 'marketSize', 'opportunities'],
		MIN_COMPLETION_SCORE: 60
	},
	[DISCOVERY_STAGES.TECHNICAL_FEASIBILITY]: {
		REQUIRED_FIELDS: ['techStack', 'architecture', 'complexity'],
		MIN_COMPLETION_SCORE: 65
	},
	[DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS]: {
		REQUIRED_FIELDS: ['functionalRequirements', 'nonFunctionalRequirements'],
		MIN_COMPLETION_SCORE: 75
	},
	[DISCOVERY_STAGES.PRD_GENERATION]: {
		REQUIRED_FIELDS: ['prdContent', 'qualityScore'],
		MIN_COMPLETION_SCORE: 80
	}
};
