#!/usr/bin/env node

/**
 * Simple test script to verify Guidant functionality
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

console.log('🧪 Testing Guidant CLI...');

try {
    // Test 1: Check package.json
    const packageJson = require('./package.json');
    console.log('✅ Package name:', packageJson.name);
    console.log('✅ Package version:', packageJson.version);
    
    // Test 2: Check if main files exist
    const fs = require('fs');
    const mainFiles = [
        'bin/task-master.js',
        'scripts/dev.js',
        'scripts/init.js',
        'src/constants/paths.js'
    ];
    
    for (const file of mainFiles) {
        if (fs.existsSync(file)) {
            console.log('✅ File exists:', file);
        } else {
            console.log('❌ File missing:', file);
        }
    }
    
    // Test 3: Try to import constants
    try {
        const paths = await import('./src/constants/paths.js');
        console.log('✅ Constants imported successfully');
        console.log('✅ GUIDANT_DIR:', paths.GUIDANT_DIR);
        console.log('✅ GUIDANT_TASKS_FILE:', paths.GUIDANT_TASKS_FILE);
    } catch (error) {
        console.log('❌ Constants import failed:', error.message);
    }
    
    // Test 4: Try to import utils
    try {
        const utils = await import('./scripts/modules/utils.js');
        console.log('✅ Utils imported successfully');
    } catch (error) {
        console.log('❌ Utils import failed:', error.message);
    }
    
    console.log('\n🎉 Basic tests completed!');
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}
