/**
 * tools/index.js
 * Export all Guidant CLI tools for MCP server
 */

import { registerListTasksTool } from './get-tasks.js';
import logger from '../logger.js';
import { registerSetTaskStatusTool } from './set-task-status.js';
import { registerParsePRDTool } from './parse-prd.js';
import { registerUpdateTool } from './update.js';
import { registerUpdateTaskTool } from './update-task.js';
import { registerUpdateSubtaskTool } from './update-subtask.js';
import { registerGenerateTool } from './generate.js';
import { registerShowTaskTool } from './get-task.js';
import { registerNextTaskTool } from './next-task.js';
import { registerExpandTaskTool } from './expand-task.js';
import { registerAddTaskTool } from './add-task.js';
import { registerAddSubtaskTool } from './add-subtask.js';
import { registerRemoveSubtaskTool } from './remove-subtask.js';
import { registerAnalyzeProjectComplexityTool } from './analyze.js';
import { registerClearSubtasksTool } from './clear-subtasks.js';
import { registerExpandAllTool } from './expand-all.js';
import { registerRemoveDependencyTool } from './remove-dependency.js';
import { registerValidateDependenciesTool } from './validate-dependencies.js';
import { registerFixDependenciesTool } from './fix-dependencies.js';
import { registerComplexityReportTool } from './complexity-report.js';
import { registerAddDependencyTool } from './add-dependency.js';
import { registerRemoveTaskTool } from './remove-task.js';
import { registerInitializeProjectTool } from './initialize-project.js';
import { registerModelsTool } from './models.js';
import { registerMoveTaskTool } from './move-task.js';
import { registerAddTagTool } from './add-tag.js';
import { registerDeleteTagTool } from './delete-tag.js';
import { registerListTagsTool } from './list-tags.js';
import { registerUseTagTool } from './use-tag.js';
import { registerRenameTagTool } from './rename-tag.js';
import { registerCopyTagTool } from './copy-tag.js';
import { registerResearchTool } from './research.js';

// Discovery tools
import { registerStartDiscoverySessionTool } from './discovery/start-discovery-session.js';
import { registerResearchMarketOpportunityTool } from './discovery/research-market-opportunity.js';
import { registerValidateTechnicalFeasibilityTool } from './discovery/validate-technical-feasibility.js';
import { registerSynthesizeRequirementsTool } from './discovery/synthesize-requirements.js';
import { registerGeneratePRDTool } from './discovery/generate-prd.js';
import { registerAssessPRDQualityTool } from './discovery/assess-prd-quality.js';

// Memory Assistant tools
import { registerGetWorkContextTool } from './memory/get-work-context.js';
import { registerGenerateProgressSummaryTool } from './memory/generate-progress-summary.js';
import { registerManageWorkSessionTool } from './memory/manage-work-session.js';

// Agile Workflow tools
import { registerManageSprintTool } from './agile/manage-sprint.js';
import { registerPrioritizeTasksTool } from './agile/prioritize-tasks.js';
import { registerGenerateBurndownTool } from './agile/generate-burndown.js';

// Collaboration tools
import { registerGenerateHandoffReportTool } from './collaboration/generate-handoff-report.js';
import { registerShareKnowledgeTool } from './collaboration/share-knowledge.js';

// Reporting tools
import { registerGenerateDashboardTool } from './reporting/generate-dashboard.js';
import { registerTrackPerformanceTool } from './reporting/track-performance.js';

/**
 * Register all Guidant tools with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerGuidantTools(server) {
	try {
		// Register each tool in a logical workflow order

		// Group 1: Initialization & Setup
		registerInitializeProjectTool(server);
		registerModelsTool(server);
		registerParsePRDTool(server);

		// Group 2: Task Analysis & Expansion
		registerAnalyzeProjectComplexityTool(server);
		registerExpandTaskTool(server);
		registerExpandAllTool(server);

		// Group 3: Task Listing & Viewing
		registerListTasksTool(server);
		registerShowTaskTool(server);
		registerNextTaskTool(server);
		registerComplexityReportTool(server);

		// Group 4: Task Status & Management
		registerSetTaskStatusTool(server);
		registerGenerateTool(server);

		// Group 5: Task Creation & Modification
		registerAddTaskTool(server);
		registerAddSubtaskTool(server);
		registerUpdateTool(server);
		registerUpdateTaskTool(server);
		registerUpdateSubtaskTool(server);
		registerRemoveTaskTool(server);
		registerRemoveSubtaskTool(server);
		registerClearSubtasksTool(server);
		registerMoveTaskTool(server);

		// Group 6: Dependency Management
		registerAddDependencyTool(server);
		registerRemoveDependencyTool(server);
		registerValidateDependenciesTool(server);
		registerFixDependenciesTool(server);

		// Group 7: Tag Management
		registerListTagsTool(server);
		registerAddTagTool(server);
		registerDeleteTagTool(server);
		registerUseTagTool(server);
		registerRenameTagTool(server);
		registerCopyTagTool(server);

		// Group 8: Research Features
		registerResearchTool(server);

		// Group 9: Discovery Workflow
		registerStartDiscoverySessionTool(server);
		registerResearchMarketOpportunityTool(server);
		registerValidateTechnicalFeasibilityTool(server);
		registerSynthesizeRequirementsTool(server);
		registerGeneratePRDTool(server);
		registerAssessPRDQualityTool(server);

		// Group 10: Memory Assistant
		registerGetWorkContextTool(server);
		registerGenerateProgressSummaryTool(server);
		registerManageWorkSessionTool(server);

		// Group 11: Agile Workflow
		registerManageSprintTool(server);
		registerPrioritizeTasksTool(server);
		registerGenerateBurndownTool(server);

		// Group 12: Collaboration
		registerGenerateHandoffReportTool(server);
		registerShareKnowledgeTool(server);

		// Group 13: Reporting & Analytics
		registerGenerateDashboardTool(server);
		registerTrackPerformanceTool(server);
	} catch (error) {
		logger.error(`Error registering Guidant tools: ${error.message}`);
		throw error;
	}
}

export default {
	registerGuidantTools
};
