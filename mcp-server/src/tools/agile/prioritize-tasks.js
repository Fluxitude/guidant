/**
 * tools/agile/prioritize-tasks.js
 * Agile Workflow MCP Tool - AI-driven task prioritization
 */

import { z } from 'zod';
import {
    createErrorResponse,
    getProjectRootFromSession
} from '../utils.js';
import { readJSON, writeJSON } from '../../../../scripts/modules/utils.js';
import { findTasksPath } from '../../core/utils/path-utils.js';
import { generateTextService } from '../../../../scripts/modules/ai-services-unified.js';

/**
 * Register the prioritize_tasks tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerPrioritizeTasksTool(server) {
    server.addTool({
        name: 'prioritize_tasks',
        description: 'AI-driven task prioritization using multiple criteria including business value, complexity, dependencies, and market research insights',
        parameters: z.object({
            method: z
                .enum(['ai', 'complexity', 'dependencies', 'business_value', 'custom'])
                .default('ai')
                .describe('Prioritization method: ai (comprehensive), complexity, dependencies, business_value, or custom'),
            criteria: z
                .string()
                .optional()
                .describe('Custom prioritization criteria (for custom method)'),
            includeResearch: z
                .boolean()
                .optional()
                .default(false)
                .describe('Include market research insights in prioritization'),
            filterStatus: z
                .enum(['todo', 'in-progress', 'all'])
                .default('todo')
                .describe('Filter tasks by status for prioritization'),
            maxTasks: z
                .number()
                .optional()
                .default(20)
                .describe('Maximum number of tasks to prioritize'),
            projectRoot: z
                .string()
                .optional()
                .describe('The directory of the project. Must be an absolute path.')
        }),

        execute: async (args, { log, session }) => {
            try {
                const { method, criteria, includeResearch, filterStatus, maxTasks } = args;
                const rootFolder = getProjectRootFromSession(session, log);

                if (!rootFolder) {
                    return createErrorResponse('Project root not found in session');
                }

                // Load tasks
                const tasksPath = findTasksPath({ projectRoot: rootFolder });
                if (!tasksPath) {
                    return createErrorResponse('No tasks file found. Initialize project first.');
                }

                const tasksData = readJSON(tasksPath, rootFolder);
                if (!tasksData || !tasksData.tasks || tasksData.tasks.length === 0) {
                    return {
                        content: [{
                            type: 'text',
                            text: '📋 **Task Prioritization**\n\nNo tasks found. Add tasks to enable prioritization.'
                        }]
                    };
                }

                // Filter tasks based on status
                let filteredTasks = tasksData.tasks;
                if (filterStatus !== 'all') {
                    filteredTasks = tasksData.tasks.filter(task => task.status === filterStatus);
                }

                if (filteredTasks.length === 0) {
                    return {
                        content: [{
                            type: 'text',
                            text: `📋 **Task Prioritization**\n\nNo tasks found with status "${filterStatus}".`
                        }]
                    };
                }

                // Limit number of tasks
                if (filteredTasks.length > maxTasks) {
                    filteredTasks = filteredTasks.slice(0, maxTasks);
                }

                // Prioritize tasks based on method
                const prioritizedTasks = await prioritizeTasks(filteredTasks, method, criteria, includeResearch);
                
                // Generate prioritization report
                const report = generatePrioritizationReport(prioritizedTasks, method, filterStatus);

                return {
                    content: [{
                        type: 'text',
                        text: report
                    }]
                };

            } catch (error) {
                log.error(`prioritize_tasks failed: ${error.message}`);
                return createErrorResponse(`Failed to prioritize tasks: ${error.message}`);
            }
        }
    });
}

/**
 * Prioritize tasks using different methods
 */
async function prioritizeTasks(tasks, method, criteria, includeResearch) {
    switch (method) {
        case 'ai':
            return await aiPrioritization(tasks, includeResearch);
        case 'complexity':
            return complexityPrioritization(tasks);
        case 'dependencies':
            return dependencyPrioritization(tasks);
        case 'business_value':
            return businessValuePrioritization(tasks);
        case 'custom':
            return await customPrioritization(tasks, criteria);
        default:
            return await aiPrioritization(tasks, includeResearch);
    }
}

/**
 * AI-driven comprehensive prioritization
 */
async function aiPrioritization(tasks, includeResearch) {
    const taskSummary = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        complexity: task.complexity || 0,
        dependencies: task.dependencies || [],
        tags: task.tags || [],
        status: task.status
    }));

    const prompt = `Analyze and prioritize these tasks based on multiple criteria:

Tasks to prioritize:
${taskSummary.map(t => `- Task ${t.id}: ${t.title}
  Description: ${t.description}
  Complexity: ${t.complexity}/10
  Dependencies: ${t.dependencies.length > 0 ? t.dependencies.join(', ') : 'None'}
  Tags: ${t.tags.join(', ')}`).join('\n\n')}

Please prioritize these tasks considering:
1. Business value and impact
2. Technical complexity and effort
3. Dependencies and blocking relationships
4. Risk factors and uncertainty
5. Strategic importance
${includeResearch ? '6. Market trends and competitive advantages' : ''}

For each task, provide:
- Priority score (1-100, where 100 is highest priority)
- Reasoning for the priority
- Recommended order of execution

Format as JSON with this structure:
{
  "prioritizedTasks": [
    {
      "id": "task_id",
      "priority": 85,
      "reasoning": "explanation",
      "recommendedOrder": 1
    }
  ],
  "summary": "Overall prioritization strategy explanation"
}`;

    try {
        const result = await generateTextService({
            prompt,
            outputType: 'mcp',
            commandName: 'prioritize_tasks'
        });

        if (result.success) {
            try {
                const aiResponse = JSON.parse(result.response);
                
                // Merge AI priorities with original task data
                const prioritizedTasks = tasks.map(task => {
                    const aiPriority = aiResponse.prioritizedTasks.find(p => p.id == task.id);
                    return {
                        ...task,
                        priority: aiPriority?.priority || 50,
                        priorityReasoning: aiPriority?.reasoning || 'No AI analysis available',
                        recommendedOrder: aiPriority?.recommendedOrder || 999
                    };
                });

                // Sort by priority (highest first)
                prioritizedTasks.sort((a, b) => b.priority - a.priority);
                
                return {
                    tasks: prioritizedTasks,
                    method: 'AI Analysis',
                    summary: aiResponse.summary || 'AI-driven prioritization completed'
                };
            } catch (parseError) {
                // Fallback to complexity prioritization if AI response is invalid
                return complexityPrioritization(tasks);
            }
        } else {
            // Fallback to complexity prioritization if AI fails
            return complexityPrioritization(tasks);
        }
    } catch (error) {
        // Fallback to complexity prioritization
        return complexityPrioritization(tasks);
    }
}

/**
 * Complexity-based prioritization (easier tasks first)
 */
function complexityPrioritization(tasks) {
    const prioritizedTasks = tasks.map(task => ({
        ...task,
        priority: Math.max(1, 100 - (task.complexity || 5) * 10),
        priorityReasoning: `Complexity-based: ${task.complexity || 5}/10 complexity`,
        recommendedOrder: 0
    }));

    // Sort by complexity (easier first)
    prioritizedTasks.sort((a, b) => (a.complexity || 5) - (b.complexity || 5));
    
    // Assign recommended order
    prioritizedTasks.forEach((task, index) => {
        task.recommendedOrder = index + 1;
    });

    return {
        tasks: prioritizedTasks,
        method: 'Complexity Analysis',
        summary: 'Tasks prioritized by complexity - easier tasks first to build momentum'
    };
}

/**
 * Dependency-based prioritization (unblocked tasks first)
 */
function dependencyPrioritization(tasks) {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    const prioritizedTasks = tasks.map(task => {
        const dependencies = task.dependencies || [];
        const blockedBy = dependencies.filter(depId => {
            const depTask = taskMap.get(depId);
            return depTask && depTask.status !== 'done';
        });
        
        const priority = Math.max(1, 100 - (blockedBy.length * 20));
        
        return {
            ...task,
            priority,
            priorityReasoning: blockedBy.length === 0 ? 
                'Ready to start - no blocking dependencies' : 
                `Blocked by ${blockedBy.length} dependencies: ${blockedBy.join(', ')}`,
            recommendedOrder: 0,
            blockedBy
        };
    });

    // Sort by dependency status (unblocked first)
    prioritizedTasks.sort((a, b) => {
        if (a.blockedBy.length !== b.blockedBy.length) {
            return a.blockedBy.length - b.blockedBy.length;
        }
        return (b.complexity || 5) - (a.complexity || 5);
    });
    
    // Assign recommended order
    prioritizedTasks.forEach((task, index) => {
        task.recommendedOrder = index + 1;
    });

    return {
        tasks: prioritizedTasks,
        method: 'Dependency Analysis',
        summary: 'Tasks prioritized by dependency status - unblocked tasks first'
    };
}

/**
 * Business value prioritization (high impact first)
 */
function businessValuePrioritization(tasks) {
    const prioritizedTasks = tasks.map(task => {
        // Estimate business value based on tags, title keywords, and complexity
        let businessValue = 50; // Base value
        
        const title = (task.title || '').toLowerCase();
        const description = (task.description || '').toLowerCase();
        const tags = task.tags || [];
        
        // High value keywords
        const highValueKeywords = ['user', 'customer', 'revenue', 'security', 'performance', 'api', 'core', 'critical'];
        const mediumValueKeywords = ['feature', 'improvement', 'optimization', 'integration'];
        const lowValueKeywords = ['refactor', 'cleanup', 'documentation', 'test'];
        
        // Adjust based on keywords
        if (highValueKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
            businessValue += 30;
        } else if (mediumValueKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
            businessValue += 15;
        } else if (lowValueKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
            businessValue -= 15;
        }
        
        // Adjust based on tags
        if (tags.includes('critical') || tags.includes('urgent')) {
            businessValue += 25;
        }
        if (tags.includes('nice-to-have') || tags.includes('optional')) {
            businessValue -= 20;
        }
        
        // Higher complexity might indicate higher value (but also higher risk)
        const complexity = task.complexity || 5;
        if (complexity > 7) {
            businessValue += 10; // High complexity might be high value
        }
        
        businessValue = Math.max(1, Math.min(100, businessValue));
        
        return {
            ...task,
            priority: businessValue,
            priorityReasoning: `Business value estimated at ${businessValue}/100 based on keywords and complexity`,
            recommendedOrder: 0
        };
    });

    // Sort by business value (highest first)
    prioritizedTasks.sort((a, b) => b.priority - a.priority);
    
    // Assign recommended order
    prioritizedTasks.forEach((task, index) => {
        task.recommendedOrder = index + 1;
    });

    return {
        tasks: prioritizedTasks,
        method: 'Business Value Analysis',
        summary: 'Tasks prioritized by estimated business value and impact'
    };
}

/**
 * Custom prioritization using user-defined criteria
 */
async function customPrioritization(tasks, criteria) {
    if (!criteria) {
        return complexityPrioritization(tasks); // Fallback
    }

    const taskSummary = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        complexity: task.complexity || 0,
        dependencies: task.dependencies || [],
        tags: task.tags || []
    }));

    const prompt = `Prioritize these tasks based on the following custom criteria: "${criteria}"

Tasks:
${taskSummary.map(t => `- Task ${t.id}: ${t.title}
  Description: ${t.description}
  Complexity: ${t.complexity}/10
  Dependencies: ${t.dependencies.join(', ') || 'None'}
  Tags: ${t.tags.join(', ')}`).join('\n\n')}

Please provide priority scores (1-100) and reasoning for each task based on the specified criteria.

Format as JSON:
{
  "prioritizedTasks": [
    {
      "id": "task_id",
      "priority": 85,
      "reasoning": "explanation based on custom criteria"
    }
  ]
}`;

    try {
        const result = await generateTextService({
            prompt,
            outputType: 'mcp',
            commandName: 'prioritize_tasks'
        });

        if (result.success) {
            const aiResponse = JSON.parse(result.response);
            
            const prioritizedTasks = tasks.map(task => {
                const aiPriority = aiResponse.prioritizedTasks.find(p => p.id == task.id);
                return {
                    ...task,
                    priority: aiPriority?.priority || 50,
                    priorityReasoning: aiPriority?.reasoning || 'No analysis available',
                    recommendedOrder: 0
                };
            });

            prioritizedTasks.sort((a, b) => b.priority - a.priority);
            prioritizedTasks.forEach((task, index) => {
                task.recommendedOrder = index + 1;
            });
            
            return {
                tasks: prioritizedTasks,
                method: 'Custom Criteria',
                summary: `Tasks prioritized based on: ${criteria}`
            };
        }
    } catch (error) {
        // Fallback to complexity prioritization
    }
    
    return complexityPrioritization(tasks);
}

/**
 * Generate prioritization report
 */
function generatePrioritizationReport(result, method, filterStatus) {
    const { tasks, method: analysisMethod, summary } = result;
    
    let report = `🎯 **Task Prioritization Report**\n\n`;
    report += `**Method**: ${analysisMethod}\n`;
    report += `**Filter**: ${filterStatus} tasks\n`;
    report += `**Total Tasks**: ${tasks.length}\n\n`;
    
    if (summary) {
        report += `**Strategy**: ${summary}\n\n`;
    }
    
    report += `**Prioritized Tasks**:\n\n`;
    
    tasks.slice(0, 10).forEach((task, index) => {
        const priorityIcon = task.priority >= 80 ? '🔴' : task.priority >= 60 ? '🟡' : '🟢';
        report += `${index + 1}. ${priorityIcon} **Task ${task.id}** (Priority: ${task.priority}/100)\n`;
        report += `   **Title**: ${task.title}\n`;
        report += `   **Complexity**: ${task.complexity || 'Unknown'}/10\n`;
        report += `   **Reasoning**: ${task.priorityReasoning}\n`;
        if (task.dependencies && task.dependencies.length > 0) {
            report += `   **Dependencies**: ${task.dependencies.join(', ')}\n`;
        }
        report += '\n';
    });
    
    if (tasks.length > 10) {
        report += `... and ${tasks.length - 10} more tasks\n\n`;
    }
    
    report += `**Recommendations**:\n`;
    report += `- Start with Task ${tasks[0].id}: ${tasks[0].title}\n`;
    report += `- Focus on top 3-5 tasks for maximum impact\n`;
    
    const highPriorityTasks = tasks.filter(t => t.priority >= 80);
    if (highPriorityTasks.length > 0) {
        report += `- ${highPriorityTasks.length} high-priority tasks need immediate attention\n`;
    }
    
    const blockedTasks = tasks.filter(t => t.blockedBy && t.blockedBy.length > 0);
    if (blockedTasks.length > 0) {
        report += `- ${blockedTasks.length} tasks are blocked by dependencies\n`;
    }
    
    return report;
}
