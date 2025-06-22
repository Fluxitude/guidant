/**
 * tools/memory/get-work-context.js
 * Memory Assistant MCP Tool - "What was I working on?"
 */

import { z } from 'zod';
import {
    createErrorResponse,
    handleApiResult,
    withNormalizedProjectRoot
} from '../utils.js';
import { findTasksPath } from '../../core/utils/path-utils.js';
import { readJSON } from '../../../../scripts/modules/utils.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Register the get_work_context tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerGetWorkContextTool(server) {
    server.addTool({
        name: 'get_work_context',
        description: 'Get context about what you were working on - shows recent tasks, current progress, and next steps with AI-generated summaries',
        parameters: z.object({
            days: z
                .number()
                .optional()
                .default(7)
                .describe('Number of days to look back for recent activity (default: 7)'),
            includeCompleted: z
                .boolean()
                .optional()
                .default(true)
                .describe('Include recently completed tasks in the context (default: true)'),
            projectRoot: z
                .string()
                .optional()
                .describe('The directory of the project. Must be an absolute path.')
        }),

        execute: withNormalizedProjectRoot(async (args, { log, session }) => {
            try {
                const { days, includeCompleted } = args;

                // Load tasks - args.projectRoot is now guaranteed to be normalized by withNormalizedProjectRoot
                const tasksPath = findTasksPath({ projectRoot: args.projectRoot });
                if (!tasksPath) {
                    return createErrorResponse('No tasks file found. Initialize project first.');
                }

                const tasksData = readJSON(tasksPath, args.projectRoot);
                if (!tasksData || !tasksData.tasks || tasksData.tasks.length === 0) {
                    return {
                        content: [{
                            type: 'text',
                            text: '📋 **Work Context Summary**\n\nNo tasks found. Start by parsing a PRD or adding tasks to get started.'
                        }]
                    };
                }

                // Analyze work context
                const context = await analyzeWorkContext(tasksData.tasks, days, includeCompleted, args.projectRoot);
                
                // Generate AI summary
                const summary = generateContextSummary(context);

                return {
                    content: [{
                        type: 'text',
                        text: summary
                    }]
                };

            } catch (error) {
                log.error(`get_work_context failed: ${error.message}`);
                return createErrorResponse(`Failed to get work context: ${error.message}`);
            }
        })
    });
}

/**
 * Analyze work context from tasks
 */
async function analyzeWorkContext(tasks, days, includeCompleted, projectRoot) {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    const context = {
        inProgress: [],
        recentlyCompleted: [],
        nextTasks: [],
        blockedTasks: [],
        totalTasks: tasks.length,
        completionRate: 0,
        recentActivity: []
    };

    // Analyze each task
    for (const task of tasks) {
        const taskDate = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt || now);
        const isRecent = taskDate >= cutoffDate;

        // Categorize tasks
        switch (task.status) {
            case 'in-progress':
                context.inProgress.push({ ...task, isRecent });
                break;
            case 'done':
                if (includeCompleted && isRecent) {
                    context.recentlyCompleted.push({ ...task, isRecent });
                }
                break;
            case 'todo':
                // Check if task is ready (no blocking dependencies)
                const isBlocked = task.dependencies && task.dependencies.some(dep => {
                    const depTask = tasks.find(t => t.id === dep);
                    return depTask && depTask.status !== 'done';
                });
                
                if (isBlocked) {
                    context.blockedTasks.push({ ...task, isRecent });
                } else {
                    context.nextTasks.push({ ...task, isRecent });
                }
                break;
        }

        // Track recent activity
        if (isRecent) {
            context.recentActivity.push({
                taskId: task.id,
                title: task.title,
                status: task.status,
                date: taskDate,
                action: task.status === 'done' ? 'completed' : 'updated'
            });
        }
    }

    // Calculate completion rate
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    context.completionRate = Math.round((completedTasks / tasks.length) * 100);

    // Sort by priority/complexity
    context.nextTasks.sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
    context.recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

    return context;
}

/**
 * Generate human-readable context summary
 */
function generateContextSummary(context) {
    const { inProgress, recentlyCompleted, nextTasks, blockedTasks, totalTasks, completionRate, recentActivity } = context;

    let summary = '📋 **Work Context Summary**\n\n';

    // Overall progress
    summary += `**📊 Project Progress**: ${completionRate}% complete (${totalTasks} total tasks)\n\n`;

    // Current work
    if (inProgress.length > 0) {
        summary += '**🔄 Currently Working On:**\n';
        inProgress.slice(0, 3).forEach(task => {
            summary += `- **Task ${task.id}**: ${task.title}\n`;
            if (task.description) {
                summary += `  ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}\n`;
            }
        });
        summary += '\n';
    }

    // Recent completions
    if (recentlyCompleted.length > 0) {
        summary += '**✅ Recently Completed:**\n';
        recentlyCompleted.slice(0, 3).forEach(task => {
            summary += `- **Task ${task.id}**: ${task.title}\n`;
        });
        summary += '\n';
    }

    // Next recommended tasks
    if (nextTasks.length > 0) {
        summary += '**⏭️ Recommended Next Tasks:**\n';
        nextTasks.slice(0, 3).forEach(task => {
            const priority = task.complexity > 7 ? '🔴 High' : task.complexity > 4 ? '🟡 Medium' : '🟢 Low';
            summary += `- **Task ${task.id}** (${priority}): ${task.title}\n`;
        });
        summary += '\n';
    }

    // Blocked tasks warning
    if (blockedTasks.length > 0) {
        summary += `**⚠️ Blocked Tasks**: ${blockedTasks.length} tasks waiting on dependencies\n\n`;
    }

    // Recent activity
    if (recentActivity.length > 0) {
        summary += '**📅 Recent Activity:**\n';
        recentActivity.slice(0, 5).forEach(activity => {
            const date = activity.date.toLocaleDateString();
            summary += `- ${date}: ${activity.action} Task ${activity.taskId} - ${activity.title}\n`;
        });
        summary += '\n';
    }

    // Recommendations
    summary += '**💡 Recommendations:**\n';
    if (inProgress.length === 0 && nextTasks.length > 0) {
        summary += '- Start working on the next recommended task\n';
    } else if (inProgress.length > 3) {
        summary += '- Consider focusing on fewer tasks to improve completion rate\n';
    }
    
    if (blockedTasks.length > 0) {
        summary += '- Review blocked tasks and resolve dependencies\n';
    }

    if (completionRate < 30) {
        summary += '- Consider breaking down complex tasks into smaller subtasks\n';
    }

    return summary;
}
