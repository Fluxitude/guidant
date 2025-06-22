/**
 * tools/memory/manage-work-session.js
 * Memory Assistant MCP Tool - Manage work sessions and context preservation
 */

import { z } from 'zod';
import {
    createErrorResponse,
    withNormalizedProjectRoot
} from '../utils.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Register the manage_work_session tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerManageWorkSessionTool(server) {
    server.addTool({
        name: 'manage_work_session',
        description: 'Manage work sessions - save context, resume sessions, and track work patterns for memory-friendly workflows',
        parameters: z.object({
            action: z
                .enum(['save', 'resume', 'list', 'clear'])
                .describe('Action to perform: save current session, resume previous session, list sessions, or clear old sessions'),
            sessionName: z
                .string()
                .optional()
                .describe('Name for the session (required for save action)'),
            notes: z
                .string()
                .optional()
                .describe('Additional notes or context for the session'),
            maxSessions: z
                .number()
                .optional()
                .default(10)
                .describe('Maximum number of sessions to keep (for clear action)'),
            projectRoot: z
                .string()
                .optional()
                .describe('The directory of the project. Must be an absolute path.')
        }),

        execute: withNormalizedProjectRoot(async (args, { log, session }) => {
            try {
                const { action, sessionName, notes, maxSessions } = args;

                // Follow Task Master directory structure: use reports directory for session data
                const sessionsDir = path.join(args.projectRoot, '.taskmaster', 'reports', 'sessions');
                await ensureDirectoryExists(sessionsDir);

                switch (action) {
                    case 'save':
                        return await saveWorkSession(sessionsDir, sessionName, notes, args.projectRoot);
                    case 'resume':
                        return await resumeWorkSession(sessionsDir, sessionName);
                    case 'list':
                        return await listWorkSessions(sessionsDir);
                    case 'clear':
                        return await clearOldSessions(sessionsDir, maxSessions);
                    default:
                        return createErrorResponse(`Unknown action: ${action}`);
                }

            } catch (error) {
                log.error(`manage_work_session failed: ${error.message}`);
                return createErrorResponse(`Failed to manage work session: ${error.message}`);
            }
        })
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
 * Save current work session
 */
async function saveWorkSession(sessionsDir, sessionName, notes, projectRoot) {
    if (!sessionName) {
        return createErrorResponse('Session name is required for save action');
    }

    const timestamp = new Date().toISOString();
    // Follow Task Master naming convention: kebab-case with timestamp
    const sessionId = `session-${sessionName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    // Gather current work context
    const context = await gatherWorkContext(projectRoot);

    const sessionData = {
        id: sessionId,
        name: sessionName,
        timestamp,
        notes: notes || '',
        context,
        projectRoot
    };

    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
    await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));

    return {
        content: [{
            type: 'text',
            text: `💾 **Work Session Saved**\n\n` +
                  `**Session**: ${sessionName}\n` +
                  `**ID**: ${sessionId}\n` +
                  `**Timestamp**: ${new Date(timestamp).toLocaleString()}\n` +
                  `**Context Captured**:\n` +
                  `- ${context.inProgressTasks} tasks in progress\n` +
                  `- ${context.recentActivity.length} recent activities\n` +
                  `- Current focus: ${context.currentFocus || 'General development'}\n\n` +
                  `Use \`manage_work_session\` with action "resume" to restore this session later.`
        }]
    };
}

/**
 * Resume a work session
 */
async function resumeWorkSession(sessionsDir, sessionName) {
    try {
        const sessions = await listSessionFiles(sessionsDir);
        
        let targetSession;
        if (sessionName) {
            // Find session by name or ID
            targetSession = sessions.find(s => 
                s.name === sessionName || 
                s.id === sessionName ||
                s.id.startsWith(sessionName.replace(/[^a-zA-Z0-9]/g, '_'))
            );
        } else {
            // Get most recent session
            targetSession = sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        }

        if (!targetSession) {
            return createErrorResponse(sessionName ? 
                `Session "${sessionName}" not found` : 
                'No sessions found to resume'
            );
        }

        const summary = generateSessionResumeSummary(targetSession);

        return {
            content: [{
                type: 'text',
                text: summary
            }]
        };

    } catch (error) {
        return createErrorResponse(`Failed to resume session: ${error.message}`);
    }
}

/**
 * List all work sessions
 */
async function listWorkSessions(sessionsDir) {
    try {
        const sessions = await listSessionFiles(sessionsDir);
        
        if (sessions.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: '📋 **Work Sessions**\n\nNo saved sessions found. Use `manage_work_session` with action "save" to create your first session.'
                }]
            };
        }

        // Sort by timestamp (newest first)
        sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let summary = '📋 **Saved Work Sessions**\n\n';
        
        sessions.forEach((session, index) => {
            const date = new Date(session.timestamp).toLocaleDateString();
            const time = new Date(session.timestamp).toLocaleTimeString();
            const isRecent = (Date.now() - new Date(session.timestamp).getTime()) < (24 * 60 * 60 * 1000);
            
            summary += `${index + 1}. **${session.name}** ${isRecent ? '🆕' : ''}\n`;
            summary += `   - **ID**: ${session.id}\n`;
            summary += `   - **Date**: ${date} at ${time}\n`;
            summary += `   - **Tasks**: ${session.context?.inProgressTasks || 0} in progress\n`;
            if (session.notes) {
                summary += `   - **Notes**: ${session.notes}\n`;
            }
            summary += '\n';
        });

        summary += `\n💡 Use \`manage_work_session\` with action "resume" and sessionName to restore any session.`;

        return {
            content: [{
                type: 'text',
                text: summary
            }]
        };

    } catch (error) {
        return createErrorResponse(`Failed to list sessions: ${error.message}`);
    }
}

/**
 * Clear old sessions
 */
async function clearOldSessions(sessionsDir, maxSessions) {
    try {
        const sessions = await listSessionFiles(sessionsDir);
        
        if (sessions.length <= maxSessions) {
            return {
                content: [{
                    type: 'text',
                    text: `🧹 **Session Cleanup**\n\nNo cleanup needed. Found ${sessions.length} sessions (limit: ${maxSessions}).`
                }]
            };
        }

        // Sort by timestamp and keep only the most recent
        sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const sessionsToDelete = sessions.slice(maxSessions);

        for (const session of sessionsToDelete) {
            const sessionFile = path.join(sessionsDir, `${session.id}.json`);
            await fs.unlink(sessionFile);
        }

        return {
            content: [{
                type: 'text',
                text: `🧹 **Session Cleanup Complete**\n\n` +
                      `- Deleted ${sessionsToDelete.length} old sessions\n` +
                      `- Kept ${maxSessions} most recent sessions\n` +
                      `- Total sessions now: ${sessions.length - sessionsToDelete.length}`
            }]
        };

    } catch (error) {
        return createErrorResponse(`Failed to clear sessions: ${error.message}`);
    }
}

/**
 * Gather current work context
 */
async function gatherWorkContext(projectRoot) {
    const context = {
        inProgressTasks: 0,
        recentActivity: [],
        currentFocus: null,
        timestamp: new Date().toISOString()
    };

    try {
        // Try to load tasks for context
        const tasksPath = path.join(projectRoot, 'tasks', 'tasks.json');
        if (await fs.access(tasksPath).then(() => true).catch(() => false)) {
            const tasksData = JSON.parse(await fs.readFile(tasksPath, 'utf8'));
            const tasks = tasksData.tasks || [];
            
            context.inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
            
            // Get recent activity (last 7 days)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            context.recentActivity = tasks
                .filter(t => new Date(t.updatedAt || t.createdAt) > weekAgo)
                .map(t => ({
                    taskId: t.id,
                    title: t.title,
                    status: t.status,
                    updatedAt: t.updatedAt || t.createdAt
                }))
                .slice(0, 10);

            // Determine current focus
            const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
            if (inProgressTasks.length > 0) {
                context.currentFocus = inProgressTasks[0].title;
            }
        }
    } catch (error) {
        // Continue with basic context if task loading fails
    }

    return context;
}

/**
 * List session files and parse their data
 */
async function listSessionFiles(sessionsDir) {
    try {
        const files = await fs.readdir(sessionsDir);
        const sessionFiles = files.filter(f => f.endsWith('.json'));
        
        const sessions = [];
        for (const file of sessionFiles) {
            try {
                const filePath = path.join(sessionsDir, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                sessions.push(data);
            } catch (error) {
                // Skip corrupted session files
                continue;
            }
        }
        
        return sessions;
    } catch (error) {
        return [];
    }
}

/**
 * Generate session resume summary
 */
function generateSessionResumeSummary(session) {
    const { name, timestamp, notes, context } = session;
    const date = new Date(timestamp).toLocaleDateString();
    const time = new Date(timestamp).toLocaleTimeString();
    
    let summary = `🔄 **Resuming Work Session**\n\n`;
    summary += `**Session**: ${name}\n`;
    summary += `**Saved**: ${date} at ${time}\n`;
    
    if (notes) {
        summary += `**Notes**: ${notes}\n`;
    }
    
    summary += `\n**Context at Save Time**:\n`;
    summary += `- ${context.inProgressTasks} tasks were in progress\n`;
    
    if (context.currentFocus) {
        summary += `- Current focus: ${context.currentFocus}\n`;
    }
    
    if (context.recentActivity && context.recentActivity.length > 0) {
        summary += `\n**Recent Activity**:\n`;
        context.recentActivity.slice(0, 5).forEach(activity => {
            summary += `- Task ${activity.taskId}: ${activity.title} (${activity.status})\n`;
        });
    }
    
    summary += `\n💡 **Next Steps**:\n`;
    summary += `- Review current task status with \`get_work_context\`\n`;
    summary += `- Check for any new tasks or updates\n`;
    summary += `- Continue where you left off\n`;
    
    return summary;
}
