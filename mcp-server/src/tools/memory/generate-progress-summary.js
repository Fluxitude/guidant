/**
 * tools/memory/generate-progress-summary.js
 * Memory Assistant MCP Tool - Generate AI-powered progress summaries
 */

import { z } from 'zod';
import {
    createErrorResponse,
    handleApiResult,
    withNormalizedProjectRoot
} from '../utils.js';
import { findTasksPath } from '../../core/utils/path-utils.js';
import { readJSON } from '../../../../scripts/modules/utils.js';
import { generateTextService } from '../../../../scripts/modules/ai-services-unified.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Register the generate_progress_summary tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerGenerateProgressSummaryTool(server) {
    server.addTool({
        name: 'generate_progress_summary',
        description: 'Generate AI-powered progress summaries for meetings, handoffs, or status reports with research-enhanced context',
        parameters: z.object({
            summaryType: z
                .enum(['daily', 'weekly', 'sprint', 'handoff', 'meeting'])
                .default('weekly')
                .describe('Type of summary to generate'),
            audience: z
                .enum(['technical', 'management', 'stakeholder', 'team'])
                .default('team')
                .describe('Target audience for the summary'),
            includeMetrics: z
                .boolean()
                .optional()
                .default(true)
                .describe('Include quantitative metrics in the summary'),
            includeBlockers: z
                .boolean()
                .optional()
                .default(true)
                .describe('Include blockers and risks in the summary'),
            projectRoot: z
                .string()
                .optional()
                .describe('The directory of the project. Must be an absolute path.')
        }),

        execute: withNormalizedProjectRoot(async (args, { log, session }) => {
            try {
                const { summaryType, audience, includeMetrics, includeBlockers } = args;

                // Load tasks and project context - args.projectRoot is now guaranteed to be normalized
                const tasksPath = findTasksPath({ projectRoot: args.projectRoot });
                if (!tasksPath) {
                    return createErrorResponse('No tasks file found. Initialize project first.');
                }

                const tasksData = readJSON(tasksPath, args.projectRoot);
                if (!tasksData || !tasksData.tasks || tasksData.tasks.length === 0) {
                    return {
                        content: [{
                            type: 'text',
                            text: '📊 **Progress Summary**\n\nNo tasks found. Initialize project and add tasks to generate meaningful summaries.'
                        }]
                    };
                }

                // Get project context
                const projectContext = await getProjectContext(args.projectRoot);
                
                // Analyze progress data
                const progressData = analyzeProgressData(tasksData.tasks, summaryType);
                
                // Generate AI-powered summary
                const summary = await generateAISummary(progressData, projectContext, summaryType, audience, includeMetrics, includeBlockers);

                return {
                    content: [{
                        type: 'text',
                        text: summary
                    }]
                };

            } catch (error) {
                log.error(`generate_progress_summary failed: ${error.message}`);
                return createErrorResponse(`Failed to generate progress summary: ${error.message}`);
            }
        })
    });
}

/**
 * Get project context from configuration and files
 */
async function getProjectContext(projectRoot) {
    const context = {
        projectName: 'Unknown Project',
        description: '',
        techStack: [],
        timeline: ''
    };

    try {
        // Try to read project config
        const configPath = path.join(projectRoot, '.taskmasterconfig');
        if (await fs.access(configPath).then(() => true).catch(() => false)) {
            const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
            context.projectName = config.projectName || context.projectName;
            context.description = config.description || context.description;
        }

        // Try to read package.json for additional context
        const packagePath = path.join(projectRoot, 'package.json');
        if (await fs.access(packagePath).then(() => true).catch(() => false)) {
            const pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
            if (!context.description) context.description = pkg.description || '';
            
            // Extract tech stack from dependencies
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            const techIndicators = {
                'react': 'React',
                'vue': 'Vue.js',
                'angular': 'Angular',
                'express': 'Express.js',
                'fastify': 'Fastify',
                'next': 'Next.js',
                'nuxt': 'Nuxt.js',
                'typescript': 'TypeScript',
                'tailwindcss': 'Tailwind CSS',
                'prisma': 'Prisma',
                'mongoose': 'MongoDB'
            };
            
            context.techStack = Object.keys(deps)
                .map(dep => techIndicators[dep])
                .filter(Boolean);
        }
    } catch (error) {
        // Continue with default context if file reading fails
    }

    return context;
}

/**
 * Analyze progress data based on summary type
 */
function analyzeProgressData(tasks, summaryType) {
    const now = new Date();
    let timeframe;
    
    switch (summaryType) {
        case 'daily':
            timeframe = 1;
            break;
        case 'weekly':
            timeframe = 7;
            break;
        case 'sprint':
            timeframe = 14; // 2 weeks
            break;
        default:
            timeframe = 7;
    }

    const cutoffDate = new Date(now.getTime() - (timeframe * 24 * 60 * 60 * 1000));

    const data = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'done').length,
        inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
        todoTasks: tasks.filter(t => t.status === 'todo').length,
        recentCompletions: [],
        currentWork: [],
        blockers: [],
        upcomingTasks: [],
        metrics: {}
    };

    // Calculate completion rate
    data.metrics.completionRate = Math.round((data.completedTasks / data.totalTasks) * 100);
    
    // Calculate velocity (tasks completed in timeframe)
    data.recentCompletions = tasks.filter(task => {
        if (task.status !== 'done') return false;
        const completedDate = new Date(task.updatedAt || task.createdAt || now);
        return completedDate >= cutoffDate;
    });
    
    data.metrics.velocity = data.recentCompletions.length;

    // Current work
    data.currentWork = tasks.filter(t => t.status === 'in-progress');

    // Identify blockers
    data.blockers = tasks.filter(task => {
        if (task.status === 'done') return false;
        return task.dependencies && task.dependencies.some(dep => {
            const depTask = tasks.find(t => t.id === dep);
            return depTask && depTask.status !== 'done';
        });
    });

    // Upcoming tasks (ready to start)
    data.upcomingTasks = tasks.filter(task => {
        if (task.status !== 'todo') return false;
        if (!task.dependencies) return true;
        return task.dependencies.every(dep => {
            const depTask = tasks.find(t => t.id === dep);
            return !depTask || depTask.status === 'done';
        });
    }).slice(0, 5); // Top 5 ready tasks

    // Calculate average complexity
    const tasksWithComplexity = tasks.filter(t => t.complexity);
    data.metrics.avgComplexity = tasksWithComplexity.length > 0 
        ? Math.round(tasksWithComplexity.reduce((sum, t) => sum + t.complexity, 0) / tasksWithComplexity.length)
        : 0;

    return data;
}

/**
 * Generate AI-powered summary using the unified AI service
 */
async function generateAISummary(progressData, projectContext, summaryType, audience, includeMetrics, includeBlockers) {
    const prompt = `Generate a ${summaryType} progress summary for ${audience} audience.

Project: ${projectContext.projectName}
${projectContext.description ? `Description: ${projectContext.description}` : ''}
${projectContext.techStack.length > 0 ? `Tech Stack: ${projectContext.techStack.join(', ')}` : ''}

Progress Data:
- Total Tasks: ${progressData.totalTasks}
- Completed: ${progressData.completedTasks} (${progressData.metrics.completionRate}%)
- In Progress: ${progressData.inProgressTasks}
- Todo: ${progressData.todoTasks}
- Recent Completions: ${progressData.metrics.velocity}
- Blockers: ${progressData.blockers.length}

Current Work:
${progressData.currentWork.map(t => `- Task ${t.id}: ${t.title}`).join('\n')}

Recent Completions:
${progressData.recentCompletions.map(t => `- Task ${t.id}: ${t.title}`).join('\n')}

${includeBlockers && progressData.blockers.length > 0 ? `
Blockers:
${progressData.blockers.map(t => `- Task ${t.id}: ${t.title} (blocked by dependencies)`).join('\n')}
` : ''}

Upcoming Tasks:
${progressData.upcomingTasks.map(t => `- Task ${t.id}: ${t.title}`).join('\n')}

Please generate a professional ${summaryType} summary that:
1. Highlights key accomplishments and progress
2. Identifies current focus areas
3. Notes any risks or blockers
4. Provides clear next steps
5. Uses appropriate tone for ${audience} audience
${includeMetrics ? '6. Includes relevant metrics and data points' : ''}

Format as markdown with clear sections and bullet points.`;

    try {
        const result = await generateTextService({
            prompt,
            outputType: 'mcp',
            commandName: 'generate_progress_summary'
        });

        if (result.success) {
            return result.response;
        } else {
            // Fallback to template-based summary if AI fails
            return generateTemplateSummary(progressData, projectContext, summaryType, audience);
        }
    } catch (error) {
        // Fallback to template-based summary
        return generateTemplateSummary(progressData, projectContext, summaryType, audience);
    }
}

/**
 * Generate template-based summary as fallback
 */
function generateTemplateSummary(progressData, projectContext, summaryType, audience) {
    const { totalTasks, completedTasks, metrics, currentWork, recentCompletions, blockers } = progressData;
    
    let summary = `# ${summaryType.charAt(0).toUpperCase() + summaryType.slice(1)} Progress Summary\n\n`;
    summary += `**Project**: ${projectContext.projectName}\n`;
    summary += `**Date**: ${new Date().toLocaleDateString()}\n\n`;
    
    summary += `## 📊 Overview\n`;
    summary += `- **Progress**: ${metrics.completionRate}% complete (${completedTasks}/${totalTasks} tasks)\n`;
    summary += `- **Velocity**: ${metrics.velocity} tasks completed recently\n`;
    summary += `- **Active Work**: ${currentWork.length} tasks in progress\n\n`;
    
    if (recentCompletions.length > 0) {
        summary += `## ✅ Recent Accomplishments\n`;
        recentCompletions.forEach(task => {
            summary += `- **Task ${task.id}**: ${task.title}\n`;
        });
        summary += '\n';
    }
    
    if (currentWork.length > 0) {
        summary += `## 🔄 Current Focus\n`;
        currentWork.forEach(task => {
            summary += `- **Task ${task.id}**: ${task.title}\n`;
        });
        summary += '\n';
    }
    
    if (blockers.length > 0) {
        summary += `## ⚠️ Blockers & Risks\n`;
        summary += `- ${blockers.length} tasks blocked by dependencies\n`;
        summary += `- Review and resolve blocking dependencies\n\n`;
    }
    
    summary += `## ⏭️ Next Steps\n`;
    summary += `- Continue work on active tasks\n`;
    summary += `- Address any blocking dependencies\n`;
    summary += `- Plan next sprint/iteration based on current velocity\n`;
    
    return summary;
}
