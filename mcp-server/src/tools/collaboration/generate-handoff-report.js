/**
 * tools/collaboration/generate-handoff-report.js
 * Collaboration MCP Tool - Generate team handoff reports
 */

import { z } from 'zod';
import {
    createErrorResponse,
    getProjectRootFromSession
} from '../utils.js';
import { readJSON } from '../../../../scripts/modules/utils.js';
import { findTasksPath } from '../../core/utils/path-utils.js';
import { generateTextService } from '../../../../scripts/modules/ai-services-unified.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Register the generate_handoff_report tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerGenerateHandoffReportTool(server) {
    server.addTool({
        name: 'generate_handoff_report',
        description: 'Generate comprehensive team handoff reports with AI-powered summaries, technical context, and knowledge transfer documentation',
        parameters: z.object({
            reportType: z
                .enum(['daily', 'weekly', 'project', 'developer', 'stakeholder'])
                .default('daily')
                .describe('Type of handoff report to generate'),
            includeContext: z
                .boolean()
                .optional()
                .default(true)
                .describe('Include technical context and code references'),
            includeTechnicalDetails: z
                .boolean()
                .optional()
                .default(true)
                .describe('Include technical implementation details and architecture notes'),
            targetAudience: z
                .enum(['technical', 'management', 'mixed', 'external'])
                .default('technical')
                .describe('Target audience for the report'),
            timeframe: z
                .number()
                .optional()
                .default(1)
                .describe('Timeframe in days for the report (default: 1 for daily)'),
            includeBlockers: z
                .boolean()
                .optional()
                .default(true)
                .describe('Include blockers and risk analysis'),
            projectRoot: z
                .string()
                .optional()
                .describe('The directory of the project. Must be an absolute path.')
        }),

        execute: async (args, { log, session }) => {
            try {
                const { reportType, includeContext, includeTechnicalDetails, targetAudience, timeframe, includeBlockers } = args;
                const rootFolder = getProjectRootFromSession(session, log);

                if (!rootFolder) {
                    return createErrorResponse('Project root not found in session');
                }

                // Gather handoff data
                const handoffData = await gatherHandoffData(rootFolder, reportType, timeframe);
                
                if (!handoffData.success) {
                    return createErrorResponse(handoffData.error);
                }

                // Generate AI-powered handoff report
                const report = await generateHandoffReport(
                    handoffData.data, 
                    reportType, 
                    targetAudience, 
                    includeContext, 
                    includeTechnicalDetails, 
                    includeBlockers,
                    rootFolder
                );

                return {
                    content: [{
                        type: 'text',
                        text: report
                    }]
                };

            } catch (error) {
                log.error(`generate_handoff_report failed: ${error.message}`);
                return createErrorResponse(`Failed to generate handoff report: ${error.message}`);
            }
        }
    });
}

/**
 * Gather data for handoff report
 */
async function gatherHandoffData(projectRoot, reportType, timeframe) {
    try {
        const data = {
            tasks: [],
            projectInfo: {},
            recentActivity: [],
            blockers: [],
            completions: [],
            workInProgress: [],
            upcomingWork: [],
            technicalContext: {}
        };

        // Load tasks
        const tasksPath = findTasksPath(projectRoot);
        if (tasksPath) {
            const tasksData = readJSON(tasksPath, projectRoot);
            if (tasksData && tasksData.tasks) {
                data.tasks = tasksData.tasks;
                
                // Analyze tasks for handoff
                const cutoffDate = new Date(Date.now() - (timeframe * 24 * 60 * 60 * 1000));
                
                data.recentActivity = tasksData.tasks.filter(task => {
                    const updatedDate = new Date(task.updatedAt || task.createdAt || Date.now());
                    return updatedDate >= cutoffDate;
                });
                
                data.completions = tasksData.tasks.filter(task => 
                    task.status === 'done' && 
                    new Date(task.updatedAt || task.createdAt || Date.now()) >= cutoffDate
                );
                
                data.workInProgress = tasksData.tasks.filter(task => task.status === 'in-progress');
                
                data.blockers = tasksData.tasks.filter(task => {
                    if (task.status === 'done') return false;
                    return task.dependencies && task.dependencies.some(dep => {
                        const depTask = tasksData.tasks.find(t => t.id === dep);
                        return depTask && depTask.status !== 'done';
                    });
                });
                
                data.upcomingWork = tasksData.tasks.filter(task => {
                    if (task.status !== 'todo') return false;
                    if (!task.dependencies) return true;
                    return task.dependencies.every(dep => {
                        const depTask = tasksData.tasks.find(t => t.id === dep);
                        return !depTask || depTask.status === 'done';
                    });
                }).slice(0, 5); // Top 5 ready tasks
            }
        }

        // Get project context
        data.projectInfo = await getProjectInfo(projectRoot);
        
        // Get technical context
        data.technicalContext = await getTechnicalContext(projectRoot);

        return { success: true, data };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Get project information
 */
async function getProjectInfo(projectRoot) {
    const info = {
        name: 'Unknown Project',
        description: '',
        version: '',
        techStack: []
    };

    try {
        // Try to read project config
        const configPath = path.join(projectRoot, '.taskmasterconfig');
        if (await fs.access(configPath).then(() => true).catch(() => false)) {
            const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
            info.name = config.projectName || info.name;
            info.description = config.description || info.description;
        }

        // Try to read package.json
        const packagePath = path.join(projectRoot, 'package.json');
        if (await fs.access(packagePath).then(() => true).catch(() => false)) {
            const pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
            if (!info.description) info.description = pkg.description || '';
            info.version = pkg.version || '';
            
            // Extract tech stack
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            const techIndicators = {
                'react': 'React',
                'vue': 'Vue.js',
                'angular': 'Angular',
                'express': 'Express.js',
                'next': 'Next.js',
                'typescript': 'TypeScript',
                'tailwindcss': 'Tailwind CSS'
            };
            
            info.techStack = Object.keys(deps)
                .map(dep => techIndicators[dep])
                .filter(Boolean);
        }
    } catch (error) {
        // Continue with default info
    }

    return info;
}

/**
 * Get technical context
 */
async function getTechnicalContext(projectRoot) {
    const context = {
        recentCommits: [],
        modifiedFiles: [],
        architecture: '',
        dependencies: []
    };

    try {
        // Try to get git information
        const gitDir = path.join(projectRoot, '.git');
        if (await fs.access(gitDir).then(() => true).catch(() => false)) {
            // Could integrate with git commands here
            context.hasGit = true;
        }

        // Scan for important files
        const importantFiles = ['README.md', 'CHANGELOG.md', 'docs/', 'src/', 'lib/'];
        for (const file of importantFiles) {
            const filePath = path.join(projectRoot, file);
            if (await fs.access(filePath).then(() => true).catch(() => false)) {
                const stats = await fs.stat(filePath);
                if (stats.isFile()) {
                    context.modifiedFiles.push({
                        path: file,
                        modified: stats.mtime.toISOString()
                    });
                }
            }
        }
    } catch (error) {
        // Continue with basic context
    }

    return context;
}

/**
 * Generate AI-powered handoff report
 */
async function generateHandoffReport(data, reportType, targetAudience, includeContext, includeTechnicalDetails, includeBlockers, projectRoot) {
    const { tasks, projectInfo, recentActivity, completions, workInProgress, blockers, upcomingWork, technicalContext } = data;

    // Create context for AI
    const contextPrompt = `Generate a comprehensive ${reportType} handoff report for ${targetAudience} audience.

Project: ${projectInfo.name}
${projectInfo.description ? `Description: ${projectInfo.description}` : ''}
${projectInfo.version ? `Version: ${projectInfo.version}` : ''}
${projectInfo.techStack.length > 0 ? `Tech Stack: ${projectInfo.techStack.join(', ')}` : ''}

Recent Activity (${recentActivity.length} items):
${recentActivity.map(task => `- Task ${task.id}: ${task.title} (${task.status})`).join('\n')}

Completed Work (${completions.length} items):
${completions.map(task => `- Task ${task.id}: ${task.title}`).join('\n')}

Work in Progress (${workInProgress.length} items):
${workInProgress.map(task => `- Task ${task.id}: ${task.title} - ${task.description || 'No description'}`).join('\n')}

${includeBlockers && blockers.length > 0 ? `
Blockers (${blockers.length} items):
${blockers.map(task => `- Task ${task.id}: ${task.title} (blocked by dependencies)`).join('\n')}
` : ''}

Ready for Next Sprint (${upcomingWork.length} items):
${upcomingWork.map(task => `- Task ${task.id}: ${task.title} (complexity: ${task.complexity || 'unknown'})`).join('\n')}

Please generate a professional handoff report that includes:
1. Executive summary of progress and status
2. Key accomplishments and completions
3. Current work status and ownership
4. Blockers and risks that need attention
5. Next steps and recommendations
6. Context for smooth knowledge transfer
${includeTechnicalDetails ? '7. Technical implementation notes and architecture considerations' : ''}
${includeContext ? '8. Important context and background information' : ''}

Format as markdown with clear sections. Adjust tone and technical depth for ${targetAudience} audience.`;

    try {
        const result = await generateTextService({
            prompt: contextPrompt,
            outputType: 'mcp',
            commandName: 'generate_handoff_report'
        });

        if (result.success) {
            return result.response;
        } else {
            // Fallback to template-based report
            return generateTemplateHandoffReport(data, reportType, targetAudience, includeBlockers);
        }
    } catch (error) {
        // Fallback to template-based report
        return generateTemplateHandoffReport(data, reportType, targetAudience, includeBlockers);
    }
}

/**
 * Generate template-based handoff report as fallback
 */
function generateTemplateHandoffReport(data, reportType, targetAudience, includeBlockers) {
    const { projectInfo, completions, workInProgress, blockers, upcomingWork, recentActivity } = data;
    
    let report = `# ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Handoff Report\n\n`;
    report += `**Project**: ${projectInfo.name}\n`;
    report += `**Date**: ${new Date().toLocaleDateString()}\n`;
    report += `**Audience**: ${targetAudience}\n\n`;
    
    // Executive Summary
    report += `## 📊 Executive Summary\n\n`;
    const totalTasks = completions.length + workInProgress.length + upcomingWork.length;
    const completionRate = totalTasks > 0 ? Math.round((completions.length / totalTasks) * 100) : 0;
    
    report += `- **Overall Progress**: ${completionRate}% completion rate\n`;
    report += `- **Completed**: ${completions.length} tasks\n`;
    report += `- **In Progress**: ${workInProgress.length} tasks\n`;
    report += `- **Ready for Next**: ${upcomingWork.length} tasks\n`;
    if (includeBlockers && blockers.length > 0) {
        report += `- **Blockers**: ${blockers.length} tasks blocked\n`;
    }
    report += '\n';
    
    // Key Accomplishments
    if (completions.length > 0) {
        report += `## ✅ Key Accomplishments\n\n`;
        completions.forEach(task => {
            report += `- **Task ${task.id}**: ${task.title}\n`;
            if (task.description && targetAudience === 'technical') {
                report += `  ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}\n`;
            }
        });
        report += '\n';
    }
    
    // Current Work
    if (workInProgress.length > 0) {
        report += `## 🔄 Current Work in Progress\n\n`;
        workInProgress.forEach(task => {
            report += `- **Task ${task.id}**: ${task.title}\n`;
            if (task.description) {
                report += `  Status: ${task.status} | Complexity: ${task.complexity || 'Unknown'}\n`;
            }
        });
        report += '\n';
    }
    
    // Blockers
    if (includeBlockers && blockers.length > 0) {
        report += `## ⚠️ Blockers & Risks\n\n`;
        blockers.forEach(task => {
            report += `- **Task ${task.id}**: ${task.title}\n`;
            report += `  Blocked by: ${task.dependencies ? task.dependencies.join(', ') : 'Unknown dependencies'}\n`;
        });
        report += '\n';
    }
    
    // Next Steps
    if (upcomingWork.length > 0) {
        report += `## ⏭️ Next Steps\n\n`;
        upcomingWork.forEach(task => {
            report += `- **Task ${task.id}**: ${task.title}\n`;
            if (targetAudience === 'technical' && task.complexity) {
                report += `  Estimated complexity: ${task.complexity}/10\n`;
            }
        });
        report += '\n';
    }
    
    // Recommendations
    report += `## 💡 Recommendations\n\n`;
    if (workInProgress.length > 3) {
        report += `- Consider focusing on fewer concurrent tasks to improve completion rate\n`;
    }
    if (blockers.length > 0) {
        report += `- Priority should be given to resolving ${blockers.length} blocking dependencies\n`;
    }
    if (completions.length > 0) {
        report += `- Good momentum with ${completions.length} recent completions\n`;
    }
    if (upcomingWork.length > 0) {
        report += `- ${upcomingWork.length} tasks are ready to start when capacity allows\n`;
    }
    
    // Technical Context (for technical audiences)
    if (targetAudience === 'technical' && projectInfo.techStack.length > 0) {
        report += `\n## 🔧 Technical Context\n\n`;
        report += `**Technology Stack**: ${projectInfo.techStack.join(', ')}\n\n`;
        if (recentActivity.length > 0) {
            report += `**Recent Technical Activity**:\n`;
            recentActivity.slice(0, 5).forEach(task => {
                report += `- ${task.title} (${task.status})\n`;
            });
        }
    }
    
    return report;
}
