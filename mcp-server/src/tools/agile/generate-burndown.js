/**
 * tools/agile/generate-burndown.js
 * Agile Workflow MCP Tool - Generate burndown charts and velocity tracking
 */

import { z } from 'zod';
import {
    createErrorResponse,
    getProjectRootFromSession
} from '../utils.js';
import { readJSON } from '../../../../scripts/modules/utils.js';
import { findTasksPath } from '../../core/utils/path-utils.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Register the generate_burndown tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerGenerateBurndownTool(server) {
    server.addTool({
        name: 'generate_burndown',
        description: 'Generate burndown charts, velocity tracking, and sprint analytics with visual markdown representations',
        parameters: z.object({
            type: z
                .enum(['sprint', 'project', 'velocity', 'cumulative'])
                .default('sprint')
                .describe('Type of burndown chart: sprint (current sprint), project (overall), velocity (historical), or cumulative (flow)'),
            sprintName: z
                .string()
                .optional()
                .describe('Specific sprint name (for sprint type)'),
            timeframe: z
                .number()
                .optional()
                .default(30)
                .describe('Timeframe in days for project/velocity charts'),
            includeProjections: z
                .boolean()
                .optional()
                .default(true)
                .describe('Include trend projections and forecasts'),
            format: z
                .enum(['markdown', 'ascii', 'data'])
                .default('markdown')
                .describe('Output format: markdown (visual), ascii (simple), or data (raw numbers)'),
            projectRoot: z
                .string()
                .optional()
                .describe('The directory of the project. Must be an absolute path.')
        }),

        execute: async (args, { log, session }) => {
            try {
                const { type, sprintName, timeframe, includeProjections, format } = args;
                const rootFolder = getProjectRootFromSession(session, log);

                if (!rootFolder) {
                    return createErrorResponse('Project root not found in session');
                }

                let chartData;
                switch (type) {
                    case 'sprint':
                        chartData = await generateSprintBurndown(rootFolder, sprintName);
                        break;
                    case 'project':
                        chartData = await generateProjectBurndown(rootFolder, timeframe);
                        break;
                    case 'velocity':
                        chartData = await generateVelocityChart(rootFolder, timeframe);
                        break;
                    case 'cumulative':
                        chartData = await generateCumulativeFlow(rootFolder, timeframe);
                        break;
                    default:
                        return createErrorResponse(`Unknown chart type: ${type}`);
                }

                if (!chartData.success) {
                    return createErrorResponse(chartData.error);
                }

                // Generate chart based on format
                const chart = generateChart(chartData, type, format, includeProjections);

                return {
                    content: [{
                        type: 'text',
                        text: chart
                    }]
                };

            } catch (error) {
                log.error(`generate_burndown failed: ${error.message}`);
                return createErrorResponse(`Failed to generate burndown: ${error.message}`);
            }
        }
    });
}

/**
 * Generate sprint burndown chart data
 */
async function generateSprintBurndown(projectRoot, sprintName) {
    try {
        // Follow Task Master directory structure: use reports directory for sprint data
        const sprintsDir = path.join(projectRoot, '.taskmaster', 'reports', 'sprints');
        
        // Find sprint
        let sprint;
        if (sprintName) {
            sprint = await findSprintByName(sprintsDir, sprintName);
        } else {
            sprint = await findActiveSprint(sprintsDir);
        }

        if (!sprint) {
            return {
                success: false,
                error: sprintName ? `Sprint "${sprintName}" not found` : 'No active sprint found'
            };
        }

        // Calculate current progress
        const currentMetrics = await calculateCurrentSprintMetrics(sprint.data, projectRoot);
        
        // Generate burndown data points
        const burndownData = generateSprintBurndownData(sprint.data, currentMetrics);

        return {
            success: true,
            data: {
                sprint: sprint.data,
                burndownData,
                currentMetrics,
                type: 'sprint'
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Failed to generate sprint burndown: ${error.message}`
        };
    }
}

/**
 * Generate project burndown chart data
 */
async function generateProjectBurndown(projectRoot, timeframe) {
    try {
        const tasksPath = findTasksPath({ projectRoot });
        if (!tasksPath) {
            return {
                success: false,
                error: 'No tasks file found'
            };
        }

        const tasksData = readJSON(tasksPath, projectRoot);
        if (!tasksData || !tasksData.tasks) {
            return {
                success: false,
                error: 'Invalid tasks data'
            };
        }

        // Generate project burndown over timeframe
        const burndownData = generateProjectBurndownData(tasksData.tasks, timeframe);

        return {
            success: true,
            data: {
                burndownData,
                totalTasks: tasksData.tasks.length,
                timeframe,
                type: 'project'
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Failed to generate project burndown: ${error.message}`
        };
    }
}

/**
 * Generate velocity chart data
 */
async function generateVelocityChart(projectRoot, timeframe) {
    try {
        // Follow Task Master directory structure: use reports directory for sprint data
        const sprintsDir = path.join(projectRoot, '.taskmaster', 'reports', 'sprints');
        const sprints = await loadAllSprints(sprintsDir);
        
        if (sprints.length === 0) {
            return {
                success: false,
                error: 'No sprint data found for velocity calculation'
            };
        }

        const velocityData = calculateVelocityData(sprints, timeframe);

        return {
            success: true,
            data: {
                velocityData,
                sprints: sprints.length,
                timeframe,
                type: 'velocity'
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Failed to generate velocity chart: ${error.message}`
        };
    }
}

/**
 * Generate cumulative flow diagram data
 */
async function generateCumulativeFlow(projectRoot, timeframe) {
    try {
        const tasksPath = findTasksPath({ projectRoot });
        if (!tasksPath) {
            return {
                success: false,
                error: 'No tasks file found'
            };
        }

        const tasksData = readJSON(tasksPath, projectRoot);
        if (!tasksData || !tasksData.tasks) {
            return {
                success: false,
                error: 'Invalid tasks data'
            };
        }

        const flowData = generateCumulativeFlowData(tasksData.tasks, timeframe);

        return {
            success: true,
            data: {
                flowData,
                timeframe,
                type: 'cumulative'
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Failed to generate cumulative flow: ${error.message}`
        };
    }
}

/**
 * Generate chart visualization
 */
function generateChart(chartData, type, format, includeProjections) {
    const { data } = chartData;
    
    switch (type) {
        case 'sprint':
            return generateSprintBurndownChart(data, format, includeProjections);
        case 'project':
            return generateProjectBurndownChart(data, format, includeProjections);
        case 'velocity':
            return generateVelocityChartVisualization(data, format);
        case 'cumulative':
            return generateCumulativeFlowChart(data, format);
        default:
            return 'Unknown chart type';
    }
}

/**
 * Generate sprint burndown chart visualization
 */
function generateSprintBurndownChart(data, format, includeProjections) {
    const { sprint, burndownData, currentMetrics } = data;
    
    let chart = `📊 **Sprint Burndown Chart: ${sprint.name}**\n\n`;
    
    // Sprint info
    chart += `**Sprint Details**:\n`;
    chart += `- Duration: ${new Date(sprint.startDate).toLocaleDateString()} - ${new Date(sprint.endDate).toLocaleDateString()}\n`;
    chart += `- Status: ${sprint.status}\n`;
    chart += `- Total Story Points: ${sprint.metrics.totalStoryPoints}\n`;
    chart += `- Completed: ${currentMetrics.completedStoryPoints}/${sprint.metrics.totalStoryPoints} (${Math.round((currentMetrics.completedStoryPoints / sprint.metrics.totalStoryPoints) * 100)}%)\n\n`;
    
    if (format === 'data') {
        chart += `**Raw Data**:\n`;
        chart += `\`\`\`json\n${JSON.stringify(burndownData, null, 2)}\n\`\`\`\n`;
        return chart;
    }
    
    // ASCII burndown chart
    chart += `**Burndown Progress**:\n`;
    chart += `\`\`\`\n`;
    
    const maxPoints = sprint.metrics.totalStoryPoints;
    const chartWidth = 50;
    const chartHeight = 10;
    
    // Generate ASCII chart
    for (let row = chartHeight; row >= 0; row--) {
        const value = Math.round((row / chartHeight) * maxPoints);
        chart += `${value.toString().padStart(3)} |`;
        
        for (let col = 0; col < chartWidth; col++) {
            const dayProgress = col / (chartWidth - 1);
            const idealRemaining = maxPoints * (1 - dayProgress);
            const actualRemaining = burndownData.length > col ? burndownData[col].remaining : maxPoints;
            
            if (Math.abs(idealRemaining - value) < maxPoints / chartHeight) {
                chart += '-'; // Ideal line
            } else if (Math.abs(actualRemaining - value) < maxPoints / chartHeight) {
                chart += '*'; // Actual line
            } else {
                chart += ' ';
            }
        }
        chart += '\n';
    }
    
    chart += `    +${'-'.repeat(chartWidth)}\n`;
    chart += `     0${' '.repeat(Math.floor(chartWidth/2) - 3)}Days${' '.repeat(Math.floor(chartWidth/2) - 2)}${sprint.duration}\n`;
    chart += `\`\`\`\n\n`;
    
    chart += `**Legend**: \`-\` = Ideal burndown, \`*\` = Actual progress\n\n`;
    
    // Progress analysis
    const daysElapsed = Math.floor((new Date() - new Date(sprint.startDate)) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, sprint.duration - daysElapsed);
    const currentVelocity = daysElapsed > 0 ? currentMetrics.completedStoryPoints / daysElapsed : 0;
    
    chart += `**Analysis**:\n`;
    chart += `- Days elapsed: ${daysElapsed}/${sprint.duration}\n`;
    chart += `- Current velocity: ${currentVelocity.toFixed(1)} points/day\n`;
    chart += `- Points remaining: ${sprint.metrics.totalStoryPoints - currentMetrics.completedStoryPoints}\n`;
    
    if (includeProjections && daysRemaining > 0) {
        const projectedCompletion = currentVelocity * sprint.duration;
        const onTrack = projectedCompletion >= sprint.metrics.totalStoryPoints * 0.9;
        
        chart += `- Projected completion: ${projectedCompletion.toFixed(0)} points (${onTrack ? '✅ On track' : '⚠️ At risk'})\n`;
        
        if (!onTrack) {
            const neededVelocity = (sprint.metrics.totalStoryPoints - currentMetrics.completedStoryPoints) / daysRemaining;
            chart += `- Required velocity: ${neededVelocity.toFixed(1)} points/day\n`;
        }
    }
    
    return chart;
}

/**
 * Generate project burndown chart
 */
function generateProjectBurndownChart(data, format, includeProjections) {
    const { burndownData, totalTasks, timeframe } = data;
    
    let chart = `📈 **Project Burndown Chart**\n\n`;
    chart += `**Project Overview**:\n`;
    chart += `- Total Tasks: ${totalTasks}\n`;
    chart += `- Timeframe: ${timeframe} days\n`;
    chart += `- Completed: ${burndownData[burndownData.length - 1]?.completed || 0}\n`;
    chart += `- Remaining: ${burndownData[burndownData.length - 1]?.remaining || totalTasks}\n\n`;
    
    if (format === 'data') {
        chart += `**Raw Data**:\n`;
        chart += `\`\`\`json\n${JSON.stringify(burndownData, null, 2)}\n\`\`\`\n`;
        return chart;
    }
    
    // Simple progress visualization
    const completionRate = ((burndownData[burndownData.length - 1]?.completed || 0) / totalTasks) * 100;
    const progressBar = '█'.repeat(Math.floor(completionRate / 2)) + '░'.repeat(50 - Math.floor(completionRate / 2));
    
    chart += `**Progress**: ${completionRate.toFixed(1)}%\n`;
    chart += `\`${progressBar}\`\n\n`;
    
    // Recent activity
    chart += `**Recent Activity** (last 7 days):\n`;
    const recentData = burndownData.slice(-7);
    recentData.forEach((day, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (recentData.length - 1 - index));
        chart += `- ${date.toLocaleDateString()}: ${day.completed} completed, ${day.remaining} remaining\n`;
    });
    
    return chart;
}

/**
 * Generate velocity chart visualization
 */
function generateVelocityChartVisualization(data, format) {
    const { velocityData, sprints } = data;
    
    let chart = `⚡ **Velocity Chart**\n\n`;
    chart += `**Team Velocity Overview**:\n`;
    chart += `- Total Sprints: ${sprints}\n`;
    chart += `- Average Velocity: ${velocityData.averageVelocity.toFixed(1)} points/sprint\n`;
    chart += `- Velocity Trend: ${velocityData.trend > 0 ? '📈 Improving' : velocityData.trend < 0 ? '📉 Declining' : '➡️ Stable'}\n\n`;
    
    if (format === 'data') {
        chart += `**Raw Data**:\n`;
        chart += `\`\`\`json\n${JSON.stringify(velocityData, null, 2)}\n\`\`\`\n`;
        return chart;
    }
    
    // Velocity history
    chart += `**Sprint Velocity History**:\n`;
    velocityData.sprintVelocities.forEach((sprint, index) => {
        const bar = '▓'.repeat(Math.floor(sprint.velocity / 2));
        chart += `Sprint ${index + 1}: ${sprint.velocity.toFixed(1)} pts ${bar}\n`;
    });
    
    chart += `\n**Insights**:\n`;
    chart += `- Highest velocity: ${Math.max(...velocityData.sprintVelocities.map(s => s.velocity)).toFixed(1)} points\n`;
    chart += `- Lowest velocity: ${Math.min(...velocityData.sprintVelocities.map(s => s.velocity)).toFixed(1)} points\n`;
    chart += `- Consistency: ${velocityData.consistency}%\n`;
    
    return chart;
}

/**
 * Generate cumulative flow chart
 */
function generateCumulativeFlowChart(data, format) {
    const { flowData } = data;
    
    let chart = `🌊 **Cumulative Flow Diagram**\n\n`;
    
    if (format === 'data') {
        chart += `**Raw Data**:\n`;
        chart += `\`\`\`json\n${JSON.stringify(flowData, null, 2)}\n\`\`\`\n`;
        return chart;
    }
    
    chart += `**Work Flow Analysis**:\n`;
    const latest = flowData[flowData.length - 1];
    chart += `- Todo: ${latest.todo} tasks\n`;
    chart += `- In Progress: ${latest.inProgress} tasks\n`;
    chart += `- Done: ${latest.done} tasks\n`;
    chart += `- Total: ${latest.todo + latest.inProgress + latest.done} tasks\n\n`;
    
    // Flow efficiency
    const wip = latest.inProgress;
    const throughput = latest.done;
    const efficiency = throughput > 0 ? (throughput / (throughput + wip)) * 100 : 0;
    
    chart += `**Flow Metrics**:\n`;
    chart += `- Work in Progress: ${wip} tasks\n`;
    chart += `- Throughput: ${throughput} tasks completed\n`;
    chart += `- Flow Efficiency: ${efficiency.toFixed(1)}%\n`;
    
    return chart;
}

// Helper functions (simplified versions)
async function findSprintByName(sprintsDir, sprintName) {
    // Implementation similar to manage-sprint.js
    try {
        const files = await fs.readdir(sprintsDir);
        for (const file of files.filter(f => f.endsWith('.json'))) {
            const data = JSON.parse(await fs.readFile(path.join(sprintsDir, file), 'utf8'));
            if (data.name === sprintName) {
                return { data, filePath: path.join(sprintsDir, file) };
            }
        }
    } catch (error) {
        // Handle error
    }
    return null;
}

async function findActiveSprint(sprintsDir) {
    try {
        const files = await fs.readdir(sprintsDir);
        for (const file of files.filter(f => f.endsWith('.json'))) {
            const data = JSON.parse(await fs.readFile(path.join(sprintsDir, file), 'utf8'));
            if (data.status === 'active') {
                return { data, filePath: path.join(sprintsDir, file) };
            }
        }
    } catch (error) {
        // Handle error
    }
    return null;
}

async function calculateCurrentSprintMetrics(sprintData, projectRoot) {
    // Calculate current sprint progress
    return {
        completedStoryPoints: sprintData.metrics.completedStoryPoints || 0,
        totalStoryPoints: sprintData.metrics.totalStoryPoints || 0,
        completedTasks: sprintData.metrics.completedTasks || 0,
        totalTasks: sprintData.tasks.length
    };
}

function generateSprintBurndownData(sprintData, currentMetrics) {
    // Generate burndown data points
    const data = [];
    const totalPoints = sprintData.metrics.totalStoryPoints;
    const duration = sprintData.duration;
    
    for (let day = 0; day <= duration; day++) {
        const idealRemaining = totalPoints * (1 - day / duration);
        const actualRemaining = day === duration ? 
            totalPoints - currentMetrics.completedStoryPoints : 
            totalPoints - (currentMetrics.completedStoryPoints * day / duration);
        
        data.push({
            day,
            ideal: Math.max(0, idealRemaining),
            remaining: Math.max(0, actualRemaining)
        });
    }
    
    return data;
}

function generateProjectBurndownData(tasks, timeframe) {
    // Generate project burndown over timeframe
    const data = [];
    const now = new Date();
    
    for (let day = 0; day < timeframe; day++) {
        const date = new Date(now.getTime() - (timeframe - day - 1) * 24 * 60 * 60 * 1000);
        const completed = tasks.filter(t => {
            const completedDate = new Date(t.updatedAt || t.createdAt || now);
            return t.status === 'done' && completedDate <= date;
        }).length;
        
        data.push({
            date: date.toISOString(),
            completed,
            remaining: tasks.length - completed
        });
    }
    
    return data;
}

async function loadAllSprints(sprintsDir) {
    try {
        const files = await fs.readdir(sprintsDir);
        const sprints = [];
        
        for (const file of files.filter(f => f.endsWith('.json'))) {
            try {
                const data = JSON.parse(await fs.readFile(path.join(sprintsDir, file), 'utf8'));
                sprints.push(data);
            } catch (error) {
                continue;
            }
        }
        
        return sprints.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    } catch (error) {
        return [];
    }
}

function calculateVelocityData(sprints, timeframe) {
    const completedSprints = sprints.filter(s => s.status === 'completed');
    const sprintVelocities = completedSprints.map(s => ({
        name: s.name,
        velocity: s.metrics.completedStoryPoints || 0,
        duration: s.duration
    }));
    
    const averageVelocity = sprintVelocities.length > 0 ?
        sprintVelocities.reduce((sum, s) => sum + s.velocity, 0) / sprintVelocities.length : 0;
    
    // Calculate trend (simple linear regression)
    let trend = 0;
    if (sprintVelocities.length > 1) {
        const recent = sprintVelocities.slice(-3);
        const older = sprintVelocities.slice(-6, -3);
        const recentAvg = recent.reduce((sum, s) => sum + s.velocity, 0) / recent.length;
        const olderAvg = older.length > 0 ? older.reduce((sum, s) => sum + s.velocity, 0) / older.length : recentAvg;
        trend = recentAvg - olderAvg;
    }
    
    return {
        sprintVelocities,
        averageVelocity,
        trend,
        consistency: calculateConsistency(sprintVelocities)
    };
}

function calculateConsistency(velocities) {
    if (velocities.length < 2) return 100;
    
    const avg = velocities.reduce((sum, v) => sum + v.velocity, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v.velocity - avg, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.max(0, 100 - (stdDev / avg) * 100);
}

function generateCumulativeFlowData(tasks, timeframe) {
    const data = [];
    const now = new Date();
    
    for (let day = 0; day < timeframe; day++) {
        const date = new Date(now.getTime() - (timeframe - day - 1) * 24 * 60 * 60 * 1000);
        
        let todo = 0, inProgress = 0, done = 0;
        
        tasks.forEach(task => {
            const createdDate = new Date(task.createdAt || now);
            const updatedDate = new Date(task.updatedAt || task.createdAt || now);
            
            if (createdDate <= date) {
                if (task.status === 'done' && updatedDate <= date) {
                    done++;
                } else if (task.status === 'in-progress') {
                    inProgress++;
                } else {
                    todo++;
                }
            }
        });
        
        data.push({ date: date.toISOString(), todo, inProgress, done });
    }
    
    return data;
}
