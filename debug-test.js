#!/usr/bin/env node

console.log('Starting debug test...');

try {
    console.log('1. Testing basic imports...');
    
    // Test 1: Basic Node.js
    console.log('Node.js version:', process.version);
    
    // Test 2: Package.json
    const fs = require('fs');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('Package name:', packageJson.name);
    console.log('Package version:', packageJson.version);
    
    // Test 3: Try importing getVersion
    console.log('2. Testing getVersion import...');
    import('./src/utils/getVersion.js').then(module => {
        console.log('getVersion imported successfully');
        const version = module.getTaskMasterVersion();
        console.log('Version from getVersion:', version);
        
        // Test 4: Try importing UI module
        console.log('3. Testing UI import...');
        return import('./scripts/modules/ui.js');
    }).then(uiModule => {
        console.log('UI module imported successfully');
        
        // Test 5: Try calling displayBanner
        console.log('4. Testing displayBanner...');
        uiModule.displayBanner();
        console.log('displayBanner completed');
        
    }).catch(error => {
        console.error('Import error:', error.message);
        console.error('Stack:', error.stack);
    });
    
} catch (error) {
    console.error('Sync error:', error.message);
    console.error('Stack:', error.stack);
}
