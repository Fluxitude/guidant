/**
 * tools/discovery/start-discovery-session.js
 * MCP tool to initialize discovery sessions with state management
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
	DISCOVERY_ERROR_CODES
} from '../../core/discovery/constants.js';

/**
 * Register the start-discovery-session tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerStartDiscoverySessionTool(server) {
	server.addTool({
		name: 'start_discovery_session',
		description: 'Initialize a new discovery session for AI-guided requirements gathering and PRD development',
		parameters: z.object({
			projectName: z
				.string()
				.min(2)
				.max(100)
				.describe('Name of the project for discovery session'),
			userPreferences: z
				.object({
					techStack: z
						.array(z.string())
						.optional()
						.describe('Preferred technology stack (e.g., ["React", "Node.js", "PostgreSQL"])'),
					references: z
						.array(z.string())
						.optional()
						.describe('Inspiration references or similar products (URLs or descriptions)'),
					constraints: z
						.array(z.string())
						.optional()
						.describe('Project constraints (e.g., ["Budget: $10k", "Timeline: 3 months"])'),
					targetAudience: z
						.string()
						.optional()
						.describe('Primary target audience description'),
					businessGoals: z
						.array(z.string())
						.optional()
						.describe('Key business objectives for the project')
				})
				.optional()
				.describe('User preferences and project context'),
			projectRoot: z
				.string()
				.optional()
				.describe('Absolute path to the project root directory (Optional, usually from session)')
		}),
		execute: async (args, { log, session }) => {
			const { projectName, userPreferences = {} } = args;

			try {
				// Get project root from session or args
				const projectRoot = getProjectRootFromSession(session, log);
				
				log.info(`Starting discovery session for project: ${projectName} in root: ${projectRoot}`);

				// Initialize the discovery session manager
				const sessionManager = new DiscoverySessionManager(projectRoot);

				// Create new discovery session
				const result = await sessionManager.createSession(projectName, userPreferences);

				if (result.success) {
					log.info(`Successfully created discovery session: ${result.session.sessionId}`);
					
					// Format response data for AI consumption
					const responseData = {
						sessionId: result.session.sessionId,
						projectName: result.session.projectName,
						stage: result.session.stage,
						status: result.session.status,
						created: result.session.created,
						progress: result.session.progress,
						metadata: result.session.metadata,
						message: DISCOVERY_MESSAGES.SESSION_CREATED,
						nextSteps: [
							'Begin with problem discovery by clearly defining the problem statement',
							'Identify target users and their pain points',
							'Define success criteria and key metrics',
							'Use research-market-opportunity tool for market validation'
						],
						availableTools: [
							'research-market-opportunity',
							'validate-technical-feasibility', 
							'synthesize-requirements'
						]
					};

					return handleApiResult(
						{ success: true, data: responseData },
						log,
						'Error starting discovery session',
						null,
						projectRoot
					);
				} else {
					log.error(`Failed to create discovery session: ${result.error.message}`);
					return createErrorResponse(result.error.message);
				}

			} catch (error) {
				log.error(`Error in start-discovery-session tool: ${error.message}\n${error.stack}`);
				
				// Handle specific error cases
				if (error.message.includes(DISCOVERY_ERROR_CODES.SESSION_EXISTS)) {
					return createErrorResponse(
						'An active discovery session already exists. Use resume-discovery-session to continue or complete the current session first.'
					);
				}
				
				return createErrorResponse(`Failed to start discovery session: ${error.message}`);
			}
		}
	});
}
