/**
 * Simple test to validate discovery components
 */

import { DiscoverySessionManager } from './mcp-server/src/core/discovery/discovery-session-manager.js';
import { PRDGenerator } from './mcp-server/src/core/discovery/prd-generator.js';
import { QualityAssessor } from './mcp-server/src/core/discovery/quality-assessor.js';
import { selectPRDTemplate } from './mcp-server/src/core/discovery/prd-templates.js';
import { DISCOVERY_STAGES } from './mcp-server/src/core/discovery/constants.js';
import fs from 'fs/promises';
import path from 'path';

async function testDiscoveryWorkflow() {
	console.log('🧪 Starting Discovery Workflow Test...\n');

	try {
		// Setup test environment
		const testRoot = './test-discovery-output';
		await fs.mkdir(testRoot, { recursive: true });
		await fs.mkdir(path.join(testRoot, '.taskmaster'), { recursive: true });

		// 1. Test Session Manager
		console.log('1️⃣ Testing DiscoverySessionManager...');
		const sessionManager = new DiscoverySessionManager(testRoot);
		
		const sessionResult = await sessionManager.createSession('Test E-commerce Platform', {
			techStack: ['React', 'Node.js', 'PostgreSQL'],
			businessGoals: ['Increase online sales', 'Improve user experience'],
			targetAudience: 'Small businesses',
			constraints: ['Budget: $50k', 'Timeline: 6 months']
		});

		if (!sessionResult.success) {
			throw new Error('Failed to create session');
		}

		console.log('✅ Session created successfully');
		console.log(`   Session ID: ${sessionResult.session.sessionId}`);
		console.log(`   Project: ${sessionResult.session.projectName}\n`);

		const sessionId = sessionResult.session.sessionId;

		// 2. Test adding research data
		console.log('2️⃣ Testing research data management...');
		await sessionManager.addResearchData(sessionId, 'marketAnalysis', {
			query: 'E-commerce market trends 2024',
			provider: 'tavily',
			results: {
				summary: 'Growing market with mobile-first trends',
				marketSize: '$6.2 trillion globally',
				keyTrends: ['Mobile commerce', 'AI personalization', 'Sustainability']
			}
		});

		await sessionManager.addResearchData(sessionId, 'technicalValidation', {
			technology: 'React',
			provider: 'context7',
			validation: {
				summary: 'Excellent choice for e-commerce frontend',
				pros: ['Component reusability', 'Large ecosystem'],
				cons: ['Learning curve']
			}
		});

		console.log('✅ Research data added successfully\n');

		// 3. Test requirements synthesis
		console.log('3️⃣ Testing requirements synthesis...');
		const requirementsData = {
			problemStatement: 'Small businesses need an affordable, easy-to-use e-commerce platform',
			targetUsers: ['Small business owners', 'Online retailers'],
			successCriteria: ['Increase sales by 30%', 'Reduce setup time to 1 hour'],
			functionalRequirements: [
				{
					id: 'FR-001',
					title: 'Product Catalog Management',
					description: 'Users can add, edit, and organize products with images and descriptions',
					priority: 'HIGH',
					userStory: 'As a store owner, I want to manage my product catalog so that customers can browse items'
				},
				{
					id: 'FR-002',
					title: 'Shopping Cart and Checkout',
					description: 'Customers can add items to cart and complete secure checkout',
					priority: 'HIGH',
					userStory: 'As a customer, I want to easily purchase products'
				},
				{
					id: 'FR-003',
					title: 'Payment Processing',
					description: 'Support multiple payment methods including credit cards',
					priority: 'HIGH'
				},
				{
					id: 'FR-004',
					title: 'Order Management',
					description: 'Store owners can view and process customer orders',
					priority: 'MEDIUM'
				}
			],
			nonFunctionalRequirements: [
				{
					id: 'NFR-001',
					category: 'Performance',
					description: 'Page load times must be under 3 seconds',
					priority: 'HIGH',
					acceptanceCriteria: 'All pages load within 3 seconds'
				},
				{
					id: 'NFR-002',
					category: 'Security',
					description: 'All payment data must be encrypted and PCI DSS compliant',
					priority: 'HIGH'
				}
			]
		};

		await sessionManager.updateStageProgress(sessionId, DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS, {
			completionScore: 100,
			lastActivity: new Date().toISOString(),
			requirementsSynthesized: true,
			functionalRequirementsCount: requirementsData.functionalRequirements.length,
			nonFunctionalRequirementsCount: requirementsData.nonFunctionalRequirements.length,
			data: requirementsData
		});

		console.log('✅ Requirements synthesis completed');
		console.log(`   Functional Requirements: ${requirementsData.functionalRequirements.length}`);
		console.log(`   Non-Functional Requirements: ${requirementsData.nonFunctionalRequirements.length}\n`);

		// 4. Test template selection
		console.log('4️⃣ Testing template selection...');
		const template = selectPRDTemplate({
			complexity: 'medium',
			projectType: 'web application',
			requirementsCount: requirementsData.functionalRequirements.length + requirementsData.nonFunctionalRequirements.length
		});

		console.log('✅ Template selected successfully');
		console.log(`   Template: ${template.name}`);
		console.log(`   Sections: ${template.sections.length}\n`);

		// 5. Test PRD generation
		console.log('5️⃣ Testing PRD generation...');
		const discoverySession = await sessionManager.getSession(sessionId);
		const prdGenerator = new PRDGenerator();
		
		const prdResult = await prdGenerator.generatePRD(discoverySession, {
			templateType: 'COMPREHENSIVE',
			outputPath: path.join(testRoot, 'docs'),
			includeResearchData: true
		});

		if (!prdResult.success) {
			throw new Error(`PRD generation failed: ${prdResult.error.message}`);
		}

		console.log('✅ PRD generated successfully');
		console.log(`   Word Count: ${prdResult.qualityAssessment.assessmentDetails.wordCount}`);
		console.log(`   Sections: ${prdResult.qualityAssessment.assessmentDetails.sectionCount}`);
		console.log(`   Quality Score: ${prdResult.qualityAssessment.overallScore}/100`);
		console.log(`   File Path: ${prdResult.prd.metadata.filePath}\n`);

		// 6. Test quality assessment
		console.log('6️⃣ Testing quality assessment...');
		const qualityAssessor = new QualityAssessor();
		const qualityResult = qualityAssessor.assessPRDQuality(
			prdResult.prd.content,
			discoverySession,
			prdResult.prd.structure
		);

		console.log('✅ Quality assessment completed');
		console.log(`   Overall Score: ${qualityResult.overallScore}/100`);
		console.log(`   Quality Level: ${qualityResult.qualityLevel}`);
		console.log(`   Ready for Development: ${qualityResult.readinessMetrics.readyForDevelopment}`);
		console.log(`   Ready for Task Generation: ${qualityResult.readinessMetrics.readyForTaskGeneration}`);
		console.log(`   Confidence Level: ${qualityResult.readinessMetrics.confidenceLevel}`);
		
		if (qualityResult.gaps.length > 0) {
			console.log(`   Gaps Identified: ${qualityResult.gaps.length}`);
			qualityResult.gaps.slice(0, 3).forEach((gap, index) => {
				console.log(`     ${index + 1}. ${gap}`);
			});
		}

		if (qualityResult.recommendations.length > 0) {
			console.log(`   Recommendations: ${qualityResult.recommendations.length}`);
			qualityResult.recommendations.slice(0, 3).forEach((rec, index) => {
				console.log(`     ${index + 1}. ${rec}`);
			});
		}

		console.log('\n🎉 All tests passed successfully!');
		console.log('\n📊 Test Summary:');
		console.log(`   ✅ Session Management: Working`);
		console.log(`   ✅ Research Data: Working`);
		console.log(`   ✅ Requirements Synthesis: Working`);
		console.log(`   ✅ Template Selection: Working`);
		console.log(`   ✅ PRD Generation: Working`);
		console.log(`   ✅ Quality Assessment: Working`);
		console.log(`   📈 Final Quality Score: ${qualityResult.overallScore}/100`);
		console.log(`   🎯 Quality Level: ${qualityResult.qualityLevel}`);

		// Cleanup
		await fs.rm(testRoot, { recursive: true, force: true });

	} catch (error) {
		console.error('❌ Test failed:', error.message);
		console.error(error.stack);
		process.exit(1);
	}
}

// Run the test
testDiscoveryWorkflow();
