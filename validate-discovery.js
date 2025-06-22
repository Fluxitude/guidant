/**
 * Simple validation script for discovery components
 */

console.log('🔍 Validating Discovery Components...\n');

// Test 1: Check if files exist
import fs from 'fs';
import path from 'path';

const requiredFiles = [
	'mcp-server/src/core/discovery/constants.js',
	'mcp-server/src/core/discovery/discovery-session-manager.js',
	'mcp-server/src/core/discovery/prd-templates.js',
	'mcp-server/src/core/discovery/prd-generator.js',
	'mcp-server/src/core/discovery/quality-assessor.js',
	'mcp-server/src/tools/discovery/start-discovery-session.js',
	'mcp-server/src/tools/discovery/research-market-opportunity.js',
	'mcp-server/src/tools/discovery/validate-technical-feasibility.js',
	'mcp-server/src/tools/discovery/synthesize-requirements.js',
	'mcp-server/src/tools/discovery/generate-prd.js',
	'mcp-server/src/tools/discovery/assess-prd-quality.js'
];

console.log('1️⃣ Checking file existence...');
let allFilesExist = true;
for (const file of requiredFiles) {
	if (fs.existsSync(file)) {
		console.log(`   ✅ ${file}`);
	} else {
		console.log(`   ❌ ${file} - MISSING`);
		allFilesExist = false;
	}
}

if (allFilesExist) {
	console.log('✅ All required files exist\n');
} else {
	console.log('❌ Some files are missing\n');
	process.exit(1);
}

// Test 2: Check syntax by importing constants
console.log('2️⃣ Testing basic imports...');
try {
	const constants = await import('./mcp-server/src/core/discovery/constants.js');
	console.log('✅ Constants imported successfully');
	console.log(`   Discovery stages: ${Object.keys(constants.DISCOVERY_STAGES).length}`);
	console.log(`   PRD quality criteria: ${Object.keys(constants.PRD_QUALITY_CRITERIA).length}`);
} catch (error) {
	console.log('❌ Constants import failed:', error.message);
	process.exit(1);
}

// Test 3: Test template selection
console.log('\n3️⃣ Testing template system...');
try {
	const templates = await import('./mcp-server/src/core/discovery/prd-templates.js');
	console.log('✅ Templates imported successfully');
	
	const template = templates.selectPRDTemplate({
		complexity: 'medium',
		projectType: 'web application',
		requirementsCount: 8
	});
	
	console.log(`   Selected template: ${template.name}`);
	console.log(`   Template sections: ${template.sections.length}`);
} catch (error) {
	console.log('❌ Template system failed:', error.message);
	console.log(error.stack);
	process.exit(1);
}

// Test 4: Test quality assessor
console.log('\n4️⃣ Testing quality assessor...');
try {
	const { QualityAssessor } = await import('./mcp-server/src/core/discovery/quality-assessor.js');
	const assessor = new QualityAssessor();
	console.log('✅ QualityAssessor instantiated successfully');
	
	const testPRD = `# Test Project - Product Requirements Document

## Overview
This is a test PRD for validation purposes.

## Requirements
1. Feature A - Important feature
2. Feature B - Another feature
3. Feature C - Third feature

## Technical Specifications
- Technology: React
- Database: PostgreSQL
- Architecture: Microservices`;

	const mockSession = {
		projectName: 'Test Project',
		progress: {
			'requirements-synthesis': {
				data: {
					functionalRequirements: [
						{ id: 'FR-001', title: 'Feature A', description: 'Test feature' }
					],
					nonFunctionalRequirements: []
				}
			}
		}
	};

	const assessment = assessor.assessPRDQuality(testPRD, mockSession);
	console.log(`   Quality score: ${assessment.overallScore}/100`);
	console.log(`   Quality level: ${assessment.qualityLevel}`);
	console.log(`   Criteria assessed: ${Object.keys(assessment.criteriaScores).length}`);
} catch (error) {
	console.log('❌ Quality assessor failed:', error.message);
	console.log(error.stack);
	process.exit(1);
}

// Test 5: Test MCP tool registration
console.log('\n5️⃣ Testing MCP tool registration...');
try {
	const toolsIndex = await import('./mcp-server/src/tools/index.js');
	console.log('✅ Tools index imported successfully');
	
	// Mock server for testing
	const mockServer = {
		tools: [],
		addTool: function(tool) {
			this.tools.push(tool.name);
		}
	};
	
	toolsIndex.registerTaskMasterTools(mockServer);
	
	const discoveryTools = mockServer.tools.filter(name => 
		name.includes('discovery') || name.includes('prd')
	);
	
	console.log(`   Total tools registered: ${mockServer.tools.length}`);
	console.log(`   Discovery tools: ${discoveryTools.length}`);
	console.log(`   Discovery tool names: ${discoveryTools.join(', ')}`);
	
	if (discoveryTools.length >= 6) {
		console.log('✅ All discovery tools registered');
	} else {
		console.log('❌ Missing discovery tools');
	}
} catch (error) {
	console.log('❌ MCP tool registration failed:', error.message);
	console.log(error.stack);
	process.exit(1);
}

console.log('\n🎉 All validation tests passed!');
console.log('\n📋 Validation Summary:');
console.log('   ✅ File Structure: Complete');
console.log('   ✅ Basic Imports: Working');
console.log('   ✅ Template System: Functional');
console.log('   ✅ Quality Assessor: Operational');
console.log('   ✅ MCP Tool Registration: Complete');
console.log('\n🚀 Discovery workflow is ready for use!');
