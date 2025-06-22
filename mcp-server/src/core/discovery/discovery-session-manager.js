/**
 * mcp-server/src/core/discovery/discovery-session-manager.js
 * Discovery session state management for AI-orchestrated workflow
 */

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import {
	DISCOVERY_STAGES,
	DISCOVERY_SESSION_STATUS,
	STAGE_STATUS,
	DISCOVERY_STAGE_ORDER,
	DISCOVERY_DEFAULTS,
	DISCOVERY_ERROR_CODES,
	DISCOVERY_MESSAGES,
	STAGE_REQUIREMENTS
} from './constants.js';
import {
	DiscoverySessionSchema,
	ExtendedStateSchema
} from './state-schema.js';

export class DiscoverySessionManager {
	constructor(projectRoot) {
		this.projectRoot = projectRoot;
		this.statePath = path.join(projectRoot, '.taskmaster', 'state.json');
		this.taskMasterDir = path.join(projectRoot, '.taskmaster');
	}

	/**
	 * Ensure .taskmaster directory exists
	 */
	async ensureTaskMasterDirectory() {
		try {
			await fs.access(this.taskMasterDir);
		} catch (error) {
			await fs.mkdir(this.taskMasterDir, { recursive: true });
		}
	}

	/**
	 * Load current state from state.json
	 */
	async loadState() {
		try {
			await this.ensureTaskMasterDirectory();
			const stateContent = await fs.readFile(this.statePath, 'utf-8');
			const state = JSON.parse(stateContent);
			return ExtendedStateSchema.parse(state);
		} catch (error) {
			// Return default state if file doesn't exist or is invalid
			return {
				currentTag: 'master',
				lastSwitched: new Date().toISOString(),
				branchTagMapping: {},
				migrationNoticeShown: false,
				discoverySession: null
			};
		}
	}

	/**
	 * Save state to state.json
	 */
	async saveState(state) {
		await this.ensureTaskMasterDirectory();
		const validatedState = ExtendedStateSchema.parse(state);
		await fs.writeFile(this.statePath, JSON.stringify(validatedState, null, 2));
		return validatedState;
	}

	/**
	 * Create a new discovery session
	 */
	async createSession(projectName, userPreferences = {}) {
		const state = await this.loadState();
		
		// Check if there's already an active session
		if (state.discoverySession && 
			state.discoverySession.status === DISCOVERY_SESSION_STATUS.ACTIVE) {
			throw new Error(`${DISCOVERY_ERROR_CODES.SESSION_EXISTS}: Active session already exists`);
		}

		const sessionId = uuidv4();
		const now = new Date().toISOString();

		// Initialize progress for all stages
		const progress = {};
		DISCOVERY_STAGE_ORDER.forEach(stage => {
			progress[stage] = {
				status: STAGE_STATUS.NOT_STARTED,
				completionScore: 0,
				data: {}
			};
		});

		// Set first stage as in progress
		progress[DISCOVERY_STAGES.PROBLEM_DISCOVERY].status = STAGE_STATUS.IN_PROGRESS;
		progress[DISCOVERY_STAGES.PROBLEM_DISCOVERY].startedAt = now;

		const discoverySession = {
			sessionId,
			projectName,
			stage: DISCOVERY_STAGES.PROBLEM_DISCOVERY,
			status: DISCOVERY_SESSION_STATUS.ACTIVE,
			progress,
			created: now,
			lastUpdated: now,
			researchData: {
				marketAnalysis: [],
				technicalValidation: [],
				competitiveAnalysis: [],
				generalResearch: []
			},
			metadata: {
				userPreferences,
				techStackPreferences: userPreferences.techStack || [],
				inspirationReferences: userPreferences.references || [],
				constraints: userPreferences.constraints || []
			}
		};

		// Validate the session
		const validatedSession = DiscoverySessionSchema.parse(discoverySession);

		// Save to state
		state.discoverySession = validatedSession;
		state.lastSwitched = now;
		await this.saveState(state);

		return {
			success: true,
			message: DISCOVERY_MESSAGES.SESSION_CREATED,
			session: validatedSession
		};
	}

	/**
	 * Resume an existing discovery session
	 */
	async resumeSession(sessionId) {
		const state = await this.loadState();
		
		if (!state.discoverySession || state.discoverySession.sessionId !== sessionId) {
			throw new Error(`${DISCOVERY_ERROR_CODES.SESSION_NOT_FOUND}: Session ${sessionId} not found`);
		}

		// Check if session is expired
		const sessionAge = Date.now() - new Date(state.discoverySession.created).getTime();
		const maxAge = DISCOVERY_DEFAULTS.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000;
		
		if (sessionAge > maxAge) {
			throw new Error(`${DISCOVERY_ERROR_CODES.SESSION_EXPIRED}: Session expired`);
		}

		// Update session status and timestamp
		state.discoverySession.status = DISCOVERY_SESSION_STATUS.ACTIVE;
		state.discoverySession.lastUpdated = new Date().toISOString();
		await this.saveState(state);

		return {
			success: true,
			message: DISCOVERY_MESSAGES.SESSION_RESUMED,
			session: state.discoverySession
		};
	}

	/**
	 * Get current active session
	 */
	async getCurrentSession() {
		const state = await this.loadState();
		return state.discoverySession;
	}

	/**
	 * Get session by ID
	 */
	async getSession(sessionId) {
		const state = await this.loadState();

		if (!state.discoverySession || state.discoverySession.sessionId !== sessionId) {
			return null;
		}

		return state.discoverySession;
	}

	/**
	 * Update session stage and progress
	 */
	async updateSessionStage(sessionId, stage, stageData = {}) {
		const state = await this.loadState();
		
		if (!state.discoverySession || state.discoverySession.sessionId !== sessionId) {
			throw new Error(`${DISCOVERY_ERROR_CODES.SESSION_NOT_FOUND}: Session ${sessionId} not found`);
		}

		// Validate stage
		if (!Object.values(DISCOVERY_STAGES).includes(stage)) {
			throw new Error(`${DISCOVERY_ERROR_CODES.INVALID_STAGE}: Invalid stage ${stage}`);
		}

		const now = new Date().toISOString();
		
		// Update current stage progress
		if (state.discoverySession.progress[stage]) {
			state.discoverySession.progress[stage] = {
				...state.discoverySession.progress[stage],
				status: STAGE_STATUS.IN_PROGRESS,
				data: { ...state.discoverySession.progress[stage].data, ...stageData },
				startedAt: state.discoverySession.progress[stage].startedAt || now
			};
		}

		// Update session
		state.discoverySession.stage = stage;
		state.discoverySession.lastUpdated = now;
		
		await this.saveState(state);

		return {
			success: true,
			message: `Stage ${stage} updated`,
			session: state.discoverySession
		};
	}

	/**
	 * Complete a discovery stage
	 */
	async completeStage(sessionId, stage, stageData = {}, completionScore = 100) {
		const state = await this.loadState();
		
		if (!state.discoverySession || state.discoverySession.sessionId !== sessionId) {
			throw new Error(`${DISCOVERY_ERROR_CODES.SESSION_NOT_FOUND}: Session ${sessionId} not found`);
		}

		const now = new Date().toISOString();
		
		// Mark current stage as completed
		state.discoverySession.progress[stage] = {
			...state.discoverySession.progress[stage],
			status: STAGE_STATUS.COMPLETED,
			completionScore,
			completedAt: now,
			data: { ...state.discoverySession.progress[stage].data, ...stageData }
		};

		// Move to next stage if available
		const currentStageIndex = DISCOVERY_STAGE_ORDER.indexOf(stage);
		const nextStage = DISCOVERY_STAGE_ORDER[currentStageIndex + 1];
		
		if (nextStage) {
			state.discoverySession.stage = nextStage;
			state.discoverySession.progress[nextStage].status = STAGE_STATUS.IN_PROGRESS;
			state.discoverySession.progress[nextStage].startedAt = now;
		} else {
			// All stages completed
			state.discoverySession.status = DISCOVERY_SESSION_STATUS.COMPLETED;
		}

		state.discoverySession.lastUpdated = now;
		await this.saveState(state);

		return {
			success: true,
			message: DISCOVERY_MESSAGES.STAGE_COMPLETED,
			session: state.discoverySession,
			nextStage
		};
	}

	/**
	 * Add research data to session
	 */
	async addResearchData(sessionId, researchType, researchQuery) {
		const state = await this.loadState();
		
		if (!state.discoverySession || state.discoverySession.sessionId !== sessionId) {
			throw new Error(`${DISCOVERY_ERROR_CODES.SESSION_NOT_FOUND}: Session ${sessionId} not found`);
		}

		// Add research query to appropriate category
		if (state.discoverySession.researchData[researchType]) {
			state.discoverySession.researchData[researchType].push({
				...researchQuery,
				timestamp: new Date().toISOString()
			});
		}

		state.discoverySession.lastUpdated = new Date().toISOString();
		await this.saveState(state);

		return {
			success: true,
			message: DISCOVERY_MESSAGES.RESEARCH_COMPLETED,
			session: state.discoverySession
		};
	}

	/**
	 * Validate stage completion requirements
	 */
	validateStageCompletion(stage, stageData) {
		const requirements = STAGE_REQUIREMENTS[stage];
		if (!requirements) return { valid: true, score: 100 };

		const requiredFields = requirements.REQUIRED_FIELDS;
		const minScore = requirements.MIN_COMPLETION_SCORE;

		let completedFields = 0;
		let totalFields = requiredFields.length;

		requiredFields.forEach(field => {
			if (stageData[field] && 
				(Array.isArray(stageData[field]) ? stageData[field].length > 0 : stageData[field].trim().length > 0)) {
				completedFields++;
			}
		});

		const completionScore = Math.round((completedFields / totalFields) * 100);
		const valid = completionScore >= minScore;

		return {
			valid,
			score: completionScore,
			completedFields,
			totalFields,
			missingFields: requiredFields.filter(field => 
				!stageData[field] || 
				(Array.isArray(stageData[field]) ? stageData[field].length === 0 : stageData[field].trim().length === 0)
			)
		};
	}

	/**
	 * Get session progress summary
	 */
	getProgressSummary(session) {
		const stages = DISCOVERY_STAGE_ORDER;
		const completedStages = stages.filter(stage => 
			session.progress[stage].status === STAGE_STATUS.COMPLETED
		).length;
		
		const overallProgress = Math.round((completedStages / stages.length) * 100);
		
		return {
			overallProgress,
			completedStages,
			totalStages: stages.length,
			currentStage: session.stage,
			stageProgress: session.progress
		};
	}
}
