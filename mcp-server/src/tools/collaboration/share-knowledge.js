/**
 * tools/collaboration/share-knowledge.js
 * Collaboration MCP Tool - Technical knowledge sharing with Context7 integration
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
 * Register the share_knowledge tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerShareKnowledgeTool(server) {
    server.addTool({
        name: 'share_knowledge',
        description: 'Create and manage technical knowledge sharing documents with Context7-powered documentation and team collaboration features',
        parameters: z.object({
            action: z
                .enum(['create', 'update', 'search', 'list', 'export'])
                .describe('Knowledge sharing action: create new document, update existing, search knowledge base, list documents, or export'),
            topic: z
                .string()
                .optional()
                .describe('Topic or title for the knowledge document'),
            content: z
                .string()
                .optional()
                .describe('Content for the knowledge document (for create/update actions)'),
            tags: z
                .string()
                .optional()
                .describe('Comma-separated tags for categorization'),
            searchQuery: z
                .string()
                .optional()
                .describe('Search query for finding knowledge documents'),
            includeContext7: z
                .boolean()
                .optional()
                .default(false)
                .describe('Include Context7 technical documentation references'),
            audience: z
                .enum(['developer', 'team', 'stakeholder', 'external'])
                .default('team')
                .describe('Target audience for the knowledge document'),
            format: z
                .enum(['markdown', 'wiki', 'documentation', 'tutorial'])
                .default('markdown')
                .describe('Format style for the knowledge document'),
            projectRoot: z
                .string()
                .optional()
                .describe('The directory of the project. Must be an absolute path.')
        }),

        execute: async (args, { log, session }) => {
            try {
                const { action, topic, content, tags, searchQuery, includeContext7, audience, format } = args;
                const rootFolder = getProjectRootFromSession(session, log);

                if (!rootFolder) {
                    return createErrorResponse('Project root not found in session');
                }

                // Follow Task Master directory structure: use docs directory for knowledge documents
                const knowledgeDir = path.join(rootFolder, '.taskmaster', 'docs', 'knowledge');
                await ensureDirectoryExists(knowledgeDir);

                switch (action) {
                    case 'create':
                        return await createKnowledgeDocument(knowledgeDir, topic, content, tags, includeContext7, audience, format, rootFolder);
                    case 'update':
                        return await updateKnowledgeDocument(knowledgeDir, topic, content, tags);
                    case 'search':
                        return await searchKnowledgeBase(knowledgeDir, searchQuery);
                    case 'list':
                        return await listKnowledgeDocuments(knowledgeDir);
                    case 'export':
                        return await exportKnowledgeBase(knowledgeDir, format);
                    default:
                        return createErrorResponse(`Unknown action: ${action}`);
                }

            } catch (error) {
                log.error(`share_knowledge failed: ${error.message}`);
                return createErrorResponse(`Failed to manage knowledge: ${error.message}`);
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
 * Create a new knowledge document
 */
async function createKnowledgeDocument(knowledgeDir, topic, content, tags, includeContext7, audience, format, projectRoot) {
    if (!topic) {
        return createErrorResponse('Topic is required for create action');
    }

    // Follow Task Master naming convention: kebab-case with timestamp
    const documentId = `knowledge-${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Enhance content with AI if needed
    let enhancedContent = content || '';
    if (!content || content.length < 50) {
        enhancedContent = await generateKnowledgeContent(topic, audience, format, projectRoot, includeContext7);
    }

    const document = {
        id: documentId,
        topic,
        content: enhancedContent,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        audience,
        format,
        includeContext7,
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1,
        author: 'Task Master AI',
        metadata: {
            wordCount: enhancedContent.split(' ').length,
            readingTime: Math.ceil(enhancedContent.split(' ').length / 200) // ~200 words per minute
        }
    };

    const documentFile = path.join(knowledgeDir, `${documentId}.json`);
    await fs.writeFile(documentFile, JSON.stringify(document, null, 2));

    // Also save as markdown for easy reading
    const markdownFile = path.join(knowledgeDir, `${documentId}.md`);
    const markdownContent = formatAsMarkdown(document);
    await fs.writeFile(markdownFile, markdownContent);

    return {
        content: [{
            type: 'text',
            text: `📚 **Knowledge Document Created**\n\n` +
                  `**Topic**: ${topic}\n` +
                  `**ID**: ${documentId}\n` +
                  `**Audience**: ${audience}\n` +
                  `**Format**: ${format}\n` +
                  `**Tags**: ${document.tags.join(', ') || 'None'}\n` +
                  `**Word Count**: ${document.metadata.wordCount}\n` +
                  `**Reading Time**: ${document.metadata.readingTime} minutes\n\n` +
                  `**Content Preview**:\n${enhancedContent.substring(0, 200)}${enhancedContent.length > 200 ? '...' : ''}\n\n` +
                  `Document saved as both JSON and Markdown formats for easy access.`
        }]
    };
}

/**
 * Update an existing knowledge document
 */
async function updateKnowledgeDocument(knowledgeDir, topic, content, tags) {
    if (!topic) {
        return createErrorResponse('Topic is required for update action');
    }

    // Find document by topic
    const document = await findDocumentByTopic(knowledgeDir, topic);
    if (!document) {
        return createErrorResponse(`Knowledge document "${topic}" not found`);
    }

    // Update document
    if (content) {
        document.data.content = content;
        document.data.metadata.wordCount = content.split(' ').length;
        document.data.metadata.readingTime = Math.ceil(content.split(' ').length / 200);
    }
    
    if (tags) {
        document.data.tags = tags.split(',').map(t => t.trim());
    }
    
    document.data.updatedAt = new Date().toISOString();
    document.data.version += 1;

    // Save updated document
    await fs.writeFile(document.filePath, JSON.stringify(document.data, null, 2));
    
    // Update markdown file
    const markdownFile = document.filePath.replace('.json', '.md');
    const markdownContent = formatAsMarkdown(document.data);
    await fs.writeFile(markdownFile, markdownContent);

    return {
        content: [{
            type: 'text',
            text: `📝 **Knowledge Document Updated**\n\n` +
                  `**Topic**: ${document.data.topic}\n` +
                  `**Version**: ${document.data.version}\n` +
                  `**Updated**: ${new Date(document.data.updatedAt).toLocaleString()}\n` +
                  `**Word Count**: ${document.data.metadata.wordCount}\n` +
                  `**Tags**: ${document.data.tags.join(', ') || 'None'}\n\n` +
                  `Document successfully updated with new content and metadata.`
        }]
    };
}

/**
 * Search knowledge base
 */
async function searchKnowledgeBase(knowledgeDir, searchQuery) {
    if (!searchQuery) {
        return createErrorResponse('Search query is required for search action');
    }

    try {
        const documents = await loadAllDocuments(knowledgeDir);
        
        if (documents.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: '📚 **Knowledge Search Results**\n\nNo knowledge documents found. Create your first document with the "create" action.'
                }]
            };
        }

        // Search documents
        const searchResults = searchDocuments(documents, searchQuery);

        if (searchResults.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: `📚 **Knowledge Search Results**\n\nNo documents found matching "${searchQuery}". Try different keywords or browse all documents with the "list" action.`
                }]
            };
        }

        let results = `📚 **Knowledge Search Results**\n\nFound ${searchResults.length} documents matching "${searchQuery}":\n\n`;
        
        searchResults.forEach((result, index) => {
            const doc = result.document;
            results += `${index + 1}. **${doc.topic}** (Score: ${result.score.toFixed(2)})\n`;
            results += `   - **Tags**: ${doc.tags.join(', ') || 'None'}\n`;
            results += `   - **Audience**: ${doc.audience}\n`;
            results += `   - **Updated**: ${new Date(doc.updatedAt).toLocaleDateString()}\n`;
            results += `   - **Preview**: ${doc.content.substring(0, 150)}...\n\n`;
        });

        return {
            content: [{
                type: 'text',
                text: results
            }]
        };

    } catch (error) {
        return createErrorResponse(`Search failed: ${error.message}`);
    }
}

/**
 * List all knowledge documents
 */
async function listKnowledgeDocuments(knowledgeDir) {
    try {
        const documents = await loadAllDocuments(knowledgeDir);
        
        if (documents.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: '📚 **Knowledge Base**\n\nNo knowledge documents found. Create your first document with `share_knowledge` action "create".'
                }]
            };
        }

        // Sort by update date (newest first)
        documents.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        let list = `📚 **Knowledge Base** (${documents.length} documents)\n\n`;
        
        // Group by tags
        const tagGroups = groupDocumentsByTags(documents);
        
        Object.keys(tagGroups).forEach(tag => {
            if (tag !== 'untagged') {
                list += `**${tag}** (${tagGroups[tag].length} documents):\n`;
                tagGroups[tag].forEach(doc => {
                    list += `- **${doc.topic}** (${doc.audience}) - ${doc.metadata.readingTime}min read\n`;
                    list += `  Updated: ${new Date(doc.updatedAt).toLocaleDateString()}\n`;
                });
                list += '\n';
            }
        });
        
        if (tagGroups.untagged && tagGroups.untagged.length > 0) {
            list += `**Untagged** (${tagGroups.untagged.length} documents):\n`;
            tagGroups.untagged.forEach(doc => {
                list += `- **${doc.topic}** (${doc.audience}) - ${doc.metadata.readingTime}min read\n`;
            });
        }

        return {
            content: [{
                type: 'text',
                text: list
            }]
        };

    } catch (error) {
        return createErrorResponse(`Failed to list documents: ${error.message}`);
    }
}

/**
 * Export knowledge base
 */
async function exportKnowledgeBase(knowledgeDir, format) {
    try {
        const documents = await loadAllDocuments(knowledgeDir);
        
        if (documents.length === 0) {
            return createErrorResponse('No knowledge documents to export');
        }

        let exportContent = '';
        
        switch (format) {
            case 'markdown':
                exportContent = exportAsMarkdown(documents);
                break;
            case 'wiki':
                exportContent = exportAsWiki(documents);
                break;
            case 'documentation':
                exportContent = exportAsDocumentation(documents);
                break;
            default:
                exportContent = exportAsMarkdown(documents);
        }

        // Save export file
        const exportFile = path.join(knowledgeDir, `knowledge_export_${Date.now()}.md`);
        await fs.writeFile(exportFile, exportContent);

        return {
            content: [{
                type: 'text',
                text: `📤 **Knowledge Base Exported**\n\n` +
                      `**Format**: ${format}\n` +
                      `**Documents**: ${documents.length}\n` +
                      `**File**: ${path.basename(exportFile)}\n\n` +
                      `**Export Preview**:\n${exportContent.substring(0, 500)}${exportContent.length > 500 ? '...' : ''}`
            }]
        };

    } catch (error) {
        return createErrorResponse(`Export failed: ${error.message}`);
    }
}

/**
 * Generate knowledge content using AI
 */
async function generateKnowledgeContent(topic, audience, format, projectRoot, includeContext7) {
    const prompt = `Generate comprehensive knowledge documentation for the topic: "${topic}"

Target audience: ${audience}
Format style: ${format}
${includeContext7 ? 'Include technical documentation references where relevant' : ''}

Please create detailed content that includes:
1. Overview and introduction
2. Key concepts and definitions
3. Implementation details (if technical)
4. Best practices and recommendations
5. Common pitfalls and how to avoid them
6. Examples and use cases
7. Related resources and references

Make the content practical, actionable, and appropriate for ${audience} audience.
Format as markdown with clear sections and structure.`;

    try {
        const result = await generateTextService({
            prompt,
            outputType: 'mcp',
            commandName: 'share_knowledge'
        });

        if (result.success) {
            return result.response;
        } else {
            return generateTemplateContent(topic, audience, format);
        }
    } catch (error) {
        return generateTemplateContent(topic, audience, format);
    }
}

/**
 * Generate template content as fallback
 */
function generateTemplateContent(topic, audience, format) {
    return `# ${topic}

## Overview
This document covers ${topic} for ${audience} audience.

## Key Points
- Important concept 1
- Important concept 2
- Important concept 3

## Implementation
Details about how to implement or use ${topic}.

## Best Practices
- Best practice 1
- Best practice 2
- Best practice 3

## Common Issues
- Issue 1 and solution
- Issue 2 and solution

## Resources
- Additional resources and references

---
*Generated by Task Master AI - Please update with specific details*`;
}

/**
 * Format document as markdown
 */
function formatAsMarkdown(document) {
    let markdown = `# ${document.topic}\n\n`;
    markdown += `**Audience**: ${document.audience} | **Format**: ${document.format} | **Version**: ${document.version}\n`;
    markdown += `**Created**: ${new Date(document.createdAt).toLocaleDateString()} | **Updated**: ${new Date(document.updatedAt).toLocaleDateString()}\n`;
    if (document.tags.length > 0) {
        markdown += `**Tags**: ${document.tags.join(', ')}\n`;
    }
    markdown += `**Reading Time**: ${document.metadata.readingTime} minutes\n\n`;
    markdown += `---\n\n`;
    markdown += document.content;
    return markdown;
}

// Helper functions
async function findDocumentByTopic(knowledgeDir, topic) {
    try {
        const files = await fs.readdir(knowledgeDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(knowledgeDir, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                if (data.topic === topic || data.id === topic) {
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

async function loadAllDocuments(knowledgeDir) {
    try {
        const files = await fs.readdir(knowledgeDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        const documents = [];
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(knowledgeDir, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                documents.push(data);
            } catch (error) {
                continue;
            }
        }
        
        return documents;
    } catch (error) {
        return [];
    }
}

function searchDocuments(documents, query) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    documents.forEach(doc => {
        let score = 0;
        
        // Search in topic (highest weight)
        if (doc.topic.toLowerCase().includes(queryLower)) {
            score += 10;
        }
        
        // Search in content
        const contentMatches = (doc.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
        score += contentMatches * 2;
        
        // Search in tags
        if (doc.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
            score += 5;
        }
        
        if (score > 0) {
            results.push({ document: doc, score });
        }
    });
    
    return results.sort((a, b) => b.score - a.score);
}

function groupDocumentsByTags(documents) {
    const groups = {};
    
    documents.forEach(doc => {
        if (doc.tags.length === 0) {
            if (!groups.untagged) groups.untagged = [];
            groups.untagged.push(doc);
        } else {
            doc.tags.forEach(tag => {
                if (!groups[tag]) groups[tag] = [];
                groups[tag].push(doc);
            });
        }
    });
    
    return groups;
}

function exportAsMarkdown(documents) {
    let content = `# Knowledge Base Export\n\nGenerated: ${new Date().toLocaleDateString()}\nTotal Documents: ${documents.length}\n\n---\n\n`;
    
    documents.forEach((doc, index) => {
        content += `## ${index + 1}. ${doc.topic}\n\n`;
        content += `**Audience**: ${doc.audience} | **Tags**: ${doc.tags.join(', ') || 'None'}\n\n`;
        content += doc.content;
        content += '\n\n---\n\n';
    });
    
    return content;
}

function exportAsWiki(documents) {
    // Similar to markdown but with wiki-style formatting
    return exportAsMarkdown(documents).replace(/^#/gm, '=').replace(/^##/gm, '==');
}

function exportAsDocumentation(documents) {
    // More structured documentation format
    let content = `# Project Knowledge Documentation\n\n`;
    content += `## Table of Contents\n\n`;
    
    documents.forEach((doc, index) => {
        content += `${index + 1}. [${doc.topic}](#${doc.topic.toLowerCase().replace(/\s+/g, '-')})\n`;
    });
    
    content += '\n---\n\n';
    content += exportAsMarkdown(documents);
    
    return content;
}
