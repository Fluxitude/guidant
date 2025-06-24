console.log('=== Guidant CLI Test ===');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());

// Test package.json
try {
    const fs = require('fs');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('✅ Package name:', packageJson.name);
    console.log('✅ Package version:', packageJson.version);

    // Test constants import
    import('./src/constants/paths.js').then(paths => {
        console.log('✅ Constants imported successfully');
        console.log('✅ GUIDANT_TASKS_FILE:', paths.GUIDANT_TASKS_FILE);
        console.log('✅ GUIDANT_DIR:', paths.GUIDANT_DIR);

        // Test if we can import the main CLI module
        return import('./scripts/modules/commands.js');
    }).then(() => {
        console.log('✅ Commands module imported successfully');
        console.log('🎉 All imports working correctly!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Import error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    });

} catch (error) {
    console.error('❌ Error reading package.json:', error.message);
    process.exit(1);
}
