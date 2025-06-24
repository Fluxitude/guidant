#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the prioritize tasks tool
import { readJSON } from './scripts/modules/utils.js';
import { findTasksPath } from './mcp-server/src/core/utils/path-utils.js';

async function testPrioritizeTasks() {
    try {
        console.log('Testing prioritize tasks functionality...');
        
        const projectRoot = process.cwd();
        console.log('Project root:', projectRoot);
        
        // Test findTasksPath
        console.log('Testing findTasksPath...');
        const tasksPath = findTasksPath({ projectRoot: projectRoot }, console);
        console.log('Tasks path found:', tasksPath);
        
        if (!tasksPath) {
            console.error('No tasks file found');
            return;
        }
        
        // Test readJSON
        console.log('Testing readJSON...');
        const tasksData = readJSON(tasksPath, projectRoot);
        console.log('Tasks data loaded:', {
            hasTasks: !!tasksData?.tasks,
            taskCount: tasksData?.tasks?.length || 0,
            tag: tasksData?.tag
        });
        
        if (!tasksData || !tasksData.tasks || tasksData.tasks.length === 0) {
            console.error('No tasks found in data');
            return;
        }
        
        // Test filtering
        console.log('Testing task filtering...');
        const pendingTasks = tasksData.tasks.filter(task => task.status === 'pending');
        console.log('Pending tasks found:', pendingTasks.length);
        
        // Show first few pending tasks
        console.log('First 3 pending tasks:');
        pendingTasks.slice(0, 3).forEach(task => {
            console.log(`- ID: ${task.id}, Title: ${task.title}, Priority: ${task.priority}`);
        });
        
        console.log('Test completed successfully!');
        
    } catch (error) {
        console.error('Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testPrioritizeTasks();
