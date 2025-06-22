/**
 * tools/agile/manage-sprint.js
 * Agile Workflow MCP Tool - Sprint management and planning
 */

import { z } from 'zod';
import {
    createErrorResponse,
    getProjectRootFromSession
} from '../utils.js';
import { readJSON, writeJSON } from '../../../../scripts/modules/utils.js';
import { findTasksPath } from '../../core/utils/path-utils.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Register the manage_sprint tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerManageSprintTool(server) {
    server.addTool({
        name: 'manage_sprint',
        description: 'Manage sprints - create, plan, track progress, and analyze sprint metrics with AI-driven insights',
        parameters: z.object({
            action: z
                .enum(['create', 'plan', 'start', 'complete', 'status', 'list'])
                .describe('Sprint action: create new sprint, plan tasks, start sprint, complete sprint, get status, or list sprints'),
            sprintName: z
                .string()
                .optional()
                .describe('Name for the sprint (required for create action)'),
            duration: z
                .number()
                .optional()
                .default(14)
                .describe('Sprint duration in days (default: 14)'),
            taskIds: z
                .string()
                .optional()
                .describe('Comma-separated task IDs to add to sprint (for plan action)'),
            capacity: z
                .number()
                .optional()
                .describe('Team capacity for the sprint (story points or hours)'),
            goals: z
                .string()
                .optional()
                .describe('Sprint goals and objectives'),
            projectRoot: z
                .string()
                .optional()
                .describe('The directory of the project. Must be an absolute path.')
        }),

        execute: async (args, { log, session }) => {
            try {
                const { action, sprintName, duration, taskIds, capacity, goals } = args;
                const rootFolder = getProjectRootFromSession(session, log);

                if (!rootFolder) {
                    return createErrorResponse('Project root not found in session');
                }

                // Follow Task Master directory structure: use reports directory for sprint data
                const sprintsDir = path.join(rootFolder, '.taskmaster', 'reports', 'sprints');
                await ensureDirectoryExists(sprintsDir);

                switch (action) {
                    case 'create':
                        return await createSprint(sprintsDir, sprintName, duration, capacity, goals, rootFolder);
                    case 'plan':
                        return await planSprint(sprintsDir, sprintName, taskIds, rootFolder);
                    case 'start':
                        return await startSprint(sprintsDir, sprintName);
                    case 'complete':
                        return await completeSprint(sprintsDir, sprintName, rootFolder);
                    case 'status':
                        return await getSprintStatus(sprintsDir, sprintName, rootFolder);
                    case 'list':
                        return await listSprints(sprintsDir);
                    default:
                        return createErrorResponse(`Unknown action: ${action}`);
                }

            } catch (error) {
                log.error(`manage_sprint failed: ${error.message}`);
                return createErrorResponse(`Failed to manage sprint: ${error.message}`);
            }
        }
    });
}

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

/**
 * Create a new sprint
 */
async function createSprint(sprintsDir, sprintName, duration, capacity, goals, projectRoot) {
    if (!sprintName) {
        return createErrorResponse('Sprint name is required for create action');
    }

    // Follow Task Master naming convention: kebab-case with timestamp
    const sprintId = `sprint-${sprintName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));

    const sprintData = {
        id: sprintId,
        name: sprintName,
        status: 'planned',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration,
        capacity: capacity || 0,
        goals: goals || '',
        tasks: [],
        metrics: {
            totalStoryPoints: 0,
            completedStoryPoints: 0,
            totalTasks: 0,
            completedTasks: 0,
            burndownData: []
        },
        createdAt: new Date().toISOString()
    };

    const sprintFile = path.join(sprintsDir, `${sprintId}.json`);
    await fs.writeFile(sprintFile, JSON.stringify(sprintData, null, 2));

    return {
        content: [{
            type: 'text',
            text: `🚀 **Sprint Created**\n\n` +
                  `**Sprint**: ${sprintName}\n` +
                  `**ID**: ${sprintId}\n` +
                  `**Duration**: ${duration} days\n` +
                  `**Start Date**: ${startDate.toLocaleDateString()}\n` +
                  `**End Date**: ${endDate.toLocaleDateString()}\n` +
                  `**Capacity**: ${capacity || 'Not set'}\n` +
                  `**Goals**: ${goals || 'None specified'}\n\n` +
                  `Use \`manage_sprint\` with action "plan" to add tasks to this sprint.`
        }]
    };
}

/**
 * Plan sprint by adding tasks
 */
async function planSprint(sprintsDir, sprintName, taskIds, projectRoot) {
    if (!sprintName) {
        return createErrorResponse('Sprint name is required for plan action');
    }

    if (!taskIds) {
        return createErrorResponse('Task IDs are required for plan action');
    }

    // Find sprint
    const sprint = await findSprintByName(sprintsDir, sprintName);
    if (!sprint) {
        return createErrorResponse(`Sprint "${sprintName}" not found`);
    }

    // Load tasks
    const tasksPath = findTasksPath(projectRoot);
    if (!tasksPath) {
        return createErrorResponse('No tasks file found. Initialize project first.');
    }

    const tasksData = readJSON(tasksPath, projectRoot);
    if (!tasksData || !tasksData.tasks) {
        return createErrorResponse('Invalid tasks data');
    }

    // Parse task IDs
    const taskIdList = taskIds.split(',').map(id => id.trim()).filter(id => id);
    const addedTasks = [];
    let totalStoryPoints = sprint.data.metrics.totalStoryPoints;

    for (const taskId of taskIdList) {
        const task = tasksData.tasks.find(t => t.id.toString() === taskId);
        if (task) {
            // Check if task is already in sprint
            if (!sprint.data.tasks.find(t => t.id === taskId)) {
                const sprintTask = {
                    id: taskId,
                    title: task.title,
                    status: task.status,
                    complexity: task.complexity || 0,
                    addedAt: new Date().toISOString()
                };
                
                sprint.data.tasks.push(sprintTask);
                addedTasks.push(sprintTask);
                totalStoryPoints += task.complexity || 0;
            }
        }
    }

    // Update metrics
    sprint.data.metrics.totalStoryPoints = totalStoryPoints;
    sprint.data.metrics.totalTasks = sprint.data.tasks.length;

    // Save updated sprint
    await fs.writeFile(sprint.filePath, JSON.stringify(sprint.data, null, 2));

    return {
        content: [{
            type: 'text',
            text: `📋 **Sprint Planning Updated**\n\n` +
                  `**Sprint**: ${sprint.data.name}\n` +
                  `**Added Tasks**: ${addedTasks.length}\n` +
                  `**Total Tasks**: ${sprint.data.tasks.length}\n` +
                  `**Total Story Points**: ${totalStoryPoints}\n\n` +
                  `**Added Tasks**:\n` +
                  addedTasks.map(t => `- Task ${t.id}: ${t.title} (${t.complexity || 0} pts)`).join('\n') +
                  `\n\nUse \`manage_sprint\` with action "start" to begin the sprint.`
        }]
    };
}

/**
 * Start a sprint
 */
async function startSprint(sprintsDir, sprintName) {
    if (!sprintName) {
        return createErrorResponse('Sprint name is required for start action');
    }

    const sprint = await findSprintByName(sprintsDir, sprintName);
    if (!sprint) {
        return createErrorResponse(`Sprint "${sprintName}" not found`);
    }

    if (sprint.data.status === 'active') {
        return createErrorResponse('Sprint is already active');
    }

    // Update sprint status
    sprint.data.status = 'active';
    sprint.data.actualStartDate = new Date().toISOString();
    
    // Initialize burndown tracking
    sprint.data.metrics.burndownData = [{
        date: new Date().toISOString(),
        remainingStoryPoints: sprint.data.metrics.totalStoryPoints,
        completedStoryPoints: 0
    }];

    await fs.writeFile(sprint.filePath, JSON.stringify(sprint.data, null, 2));

    return {
        content: [{
            type: 'text',
            text: `🏁 **Sprint Started**\n\n` +
                  `**Sprint**: ${sprint.data.name}\n` +
                  `**Status**: Active\n` +
                  `**Start Date**: ${new Date().toLocaleDateString()}\n` +
                  `**End Date**: ${new Date(sprint.data.endDate).toLocaleDateString()}\n` +
                  `**Total Tasks**: ${sprint.data.tasks.length}\n` +
                  `**Total Story Points**: ${sprint.data.metrics.totalStoryPoints}\n\n` +
                  `Sprint is now active! Track progress with \`manage_sprint\` action "status".`
        }]
    };
}

/**
 * Complete a sprint
 */
async function completeSprint(sprintsDir, sprintName, projectRoot) {
    if (!sprintName) {
        return createErrorResponse('Sprint name is required for complete action');
    }

    const sprint = await findSprintByName(sprintsDir, sprintName);
    if (!sprint) {
        return createErrorResponse(`Sprint "${sprintName}" not found`);
    }

    // Calculate final metrics
    const finalMetrics = await calculateSprintMetrics(sprint.data, projectRoot);
    
    sprint.data.status = 'completed';
    sprint.data.completedAt = new Date().toISOString();
    sprint.data.metrics = { ...sprint.data.metrics, ...finalMetrics };

    await fs.writeFile(sprint.filePath, JSON.stringify(sprint.data, null, 2));

    const velocity = finalMetrics.completedStoryPoints;
    const completionRate = Math.round((finalMetrics.completedTasks / finalMetrics.totalTasks) * 100);

    return {
        content: [{
            type: 'text',
            text: `🎯 **Sprint Completed**\n\n` +
                  `**Sprint**: ${sprint.data.name}\n` +
                  `**Completion Rate**: ${completionRate}%\n` +
                  `**Velocity**: ${velocity} story points\n` +
                  `**Tasks Completed**: ${finalMetrics.completedTasks}/${finalMetrics.totalTasks}\n` +
                  `**Duration**: ${sprint.data.duration} days\n\n` +
                  `**Sprint Summary**:\n` +
                  `- Planned: ${sprint.data.metrics.totalStoryPoints} story points\n` +
                  `- Delivered: ${velocity} story points\n` +
                  `- Success Rate: ${Math.round((velocity / sprint.data.metrics.totalStoryPoints) * 100)}%\n\n` +
                  `Great work! Use this velocity data for planning future sprints.`
        }]
    };
}

/**
 * Get sprint status
 */
async function getSprintStatus(sprintsDir, sprintName, projectRoot) {
    const sprint = sprintName ? 
        await findSprintByName(sprintsDir, sprintName) :
        await findActiveSprint(sprintsDir);

    if (!sprint) {
        return createErrorResponse(sprintName ? 
            `Sprint "${sprintName}" not found` : 
            'No active sprint found'
        );
    }

    const metrics = await calculateSprintMetrics(sprint.data, projectRoot);
    const daysRemaining = Math.ceil((new Date(sprint.data.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    const completionRate = Math.round((metrics.completedTasks / metrics.totalTasks) * 100);

    return {
        content: [{
            type: 'text',
            text: `📊 **Sprint Status: ${sprint.data.name}**\n\n` +
                  `**Status**: ${sprint.data.status}\n` +
                  `**Progress**: ${completionRate}% complete\n` +
                  `**Days Remaining**: ${daysRemaining > 0 ? daysRemaining : 'Overdue'}\n` +
                  `**Tasks**: ${metrics.completedTasks}/${metrics.totalTasks} completed\n` +
                  `**Story Points**: ${metrics.completedStoryPoints}/${metrics.totalStoryPoints} completed\n\n` +
                  `**Goals**: ${sprint.data.goals || 'None specified'}\n\n` +
                  `**Recent Progress**:\n` +
                  (sprint.data.metrics.burndownData.length > 1 ? 
                    `- Yesterday: ${sprint.data.metrics.burndownData[sprint.data.metrics.burndownData.length - 2]?.completedStoryPoints || 0} pts\n` +
                    `- Today: ${metrics.completedStoryPoints} pts\n` +
                    `- Velocity: ${metrics.completedStoryPoints - (sprint.data.metrics.burndownData[sprint.data.metrics.burndownData.length - 2]?.completedStoryPoints || 0)} pts/day` :
                    '- Sprint just started'
                  )
        }]
    };
}

/**
 * List all sprints
 */
async function listSprints(sprintsDir) {
    try {
        const files = await fs.readdir(sprintsDir);
        const sprintFiles = files.filter(f => f.endsWith('.json'));
        
        if (sprintFiles.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: '📋 **Sprints**\n\nNo sprints found. Use `manage_sprint` with action "create" to create your first sprint.'
                }]
            };
        }

        const sprints = [];
        for (const file of sprintFiles) {
            try {
                const filePath = path.join(sprintsDir, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                sprints.push(data);
            } catch (error) {
                continue; // Skip corrupted files
            }
        }

        // Sort by creation date (newest first)
        sprints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let summary = '📋 **Sprint History**\n\n';
        
        sprints.forEach((sprint, index) => {
            const startDate = new Date(sprint.startDate).toLocaleDateString();
            const endDate = new Date(sprint.endDate).toLocaleDateString();
            const statusIcon = sprint.status === 'active' ? '🏃' : sprint.status === 'completed' ? '✅' : '📅';
            
            summary += `${index + 1}. ${statusIcon} **${sprint.name}**\n`;
            summary += `   - **Status**: ${sprint.status}\n`;
            summary += `   - **Duration**: ${startDate} - ${endDate}\n`;
            summary += `   - **Tasks**: ${sprint.tasks.length} (${sprint.metrics.totalStoryPoints} pts)\n`;
            if (sprint.status === 'completed') {
                const completionRate = Math.round((sprint.metrics.completedTasks / sprint.metrics.totalTasks) * 100);
                summary += `   - **Completion**: ${completionRate}% (${sprint.metrics.completedStoryPoints} pts delivered)\n`;
            }
            summary += '\n';
        });

        return {
            content: [{
                type: 'text',
                text: summary
            }]
        };

    } catch (error) {
        return createErrorResponse(`Failed to list sprints: ${error.message}`);
    }
}

/**
 * Find sprint by name
 */
async function findSprintByName(sprintsDir, sprintName) {
    try {
        const files = await fs.readdir(sprintsDir);
        const sprintFiles = files.filter(f => f.endsWith('.json'));
        
        for (const file of sprintFiles) {
            try {
                const filePath = path.join(sprintsDir, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                if (data.name === sprintName || data.id === sprintName) {
                    return { data, filePath };
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Find active sprint
 */
async function findActiveSprint(sprintsDir) {
    try {
        const files = await fs.readdir(sprintsDir);
        const sprintFiles = files.filter(f => f.endsWith('.json'));
        
        for (const file of sprintFiles) {
            try {
                const filePath = path.join(sprintsDir, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                if (data.status === 'active') {
                    return { data, filePath };
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Calculate sprint metrics
 */
async function calculateSprintMetrics(sprintData, projectRoot) {
    const metrics = {
        totalTasks: sprintData.tasks.length,
        completedTasks: 0,
        totalStoryPoints: sprintData.metrics.totalStoryPoints,
        completedStoryPoints: 0
    };

    try {
        // Load current task status
        const tasksPath = findTasksPath(projectRoot);
        if (tasksPath) {
            const tasksData = readJSON(tasksPath, projectRoot);
            if (tasksData && tasksData.tasks) {
                for (const sprintTask of sprintData.tasks) {
                    const currentTask = tasksData.tasks.find(t => t.id.toString() === sprintTask.id);
                    if (currentTask && currentTask.status === 'done') {
                        metrics.completedTasks++;
                        metrics.completedStoryPoints += sprintTask.complexity || 0;
                    }
                }
            }
        }
    } catch (error) {
        // Use sprint data as fallback
    }

    return metrics;
}
