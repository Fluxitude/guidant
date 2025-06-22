/**
 * tests/e2e/discovery-workflow.test.js
 * End-to-end testing of the complete discovery workflow
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { DiscoverySessionManager } from '../../mcp-server/src/core/discovery/discovery-session-manager.js';
import { PRDGenerator } from '../../mcp-server/src/core/discovery/prd-generator.js';
import { QualityAssessor } from '../../mcp-server/src/core/discovery/quality-assessor.js';
import { 
	DISCOVERY_STAGES, 
	DISCOVERY_SESSION_STATUS,
	PRD_QUALITY_THRESHOLDS 
} from '../../mcp-server/src/core/discovery/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Discovery Workflow End-to-End Tests', () => {
	let testProjectRoot;
	let sessionManager;
	let prdGenerator;
	let qualityAssessor;
	let testSessionId;

	beforeAll(async () => {
		// Setup test environment
		testProjectRoot = path.join(__dirname, '../fixtures/test-project');
		await fs.mkdir(testProjectRoot, { recursive: true });
		await fs.mkdir(path.join(testProjectRoot, '.taskmaster'), { recursive: true });
		
		// Initialize components
		sessionManager = new DiscoverySessionManager(testProjectRoot);
		prdGenerator = new PRDGenerator();
		qualityAssessor = new QualityAssessor();
	});

	afterAll(async () => {
		// Cleanup test environment
		try {
			await fs.rm(testProjectRoot, { recursive: true, force: true });
		} catch (error) {
			console.warn('Cleanup warning:', error.message);
		}
	});

	describe('Complete Discovery Workflow', () => {
		test('should execute complete workflow from session creation to PRD generation', async () => {
			// Step 1: Create discovery session
			const sessionResult = await sessionManager.createSession('E-commerce Platform', {
				techStack: ['React', 'Node.js', 'PostgreSQL'],
				businessGoals: ['Increase online sales', 'Improve user experience'],
				targetAudience: 'Small to medium businesses',
				constraints: ['Budget: $50k', 'Timeline: 6 months']
			});

			expect(sessionResult.success).toBe(true);
			expect(sessionResult.session).toBeDefined();
			expect(sessionResult.session.projectName).toBe('E-commerce Platform');
			testSessionId = sessionResult.session.sessionId;

			// Step 2: Add market research data
			await sessionManager.addResearchData(testSessionId, 'marketAnalysis', {
				query: 'E-commerce market trends 2024',
				provider: 'tavily',
				results: {
					summary: 'Growing market with mobile-first trends',
					marketSize: '$6.2 trillion globally',
					keyTrends: ['Mobile commerce', 'AI personalization', 'Sustainability']
				},
				targetMarket: 'SMB e-commerce',
				competitors: ['Shopify', 'WooCommerce', 'BigCommerce']
			});

			// Step 3: Add technical validation data
			await sessionManager.addResearchData(testSessionId, 'technicalValidation', {
				technology: 'React',
				provider: 'context7',
				validation: {
					summary: 'Excellent choice for e-commerce frontend',
					pros: ['Component reusability', 'Large ecosystem', 'Performance'],
					cons: ['Learning curve', 'Rapid updates']
				},
				projectType: 'web application',
				scale: 'medium'
			});

			// Step 4: Update stage progress for market research
			await sessionManager.updateStageProgress(testSessionId, DISCOVERY_STAGES.MARKET_RESEARCH, {
				completionScore: 85,
				lastActivity: new Date().toISOString(),
				researchQueriesCompleted: 3,
				totalQueries: 3
			});

			// Step 5: Update stage progress for technical feasibility
			await sessionManager.updateStageProgress(testSessionId, DISCOVERY_STAGES.TECHNICAL_FEASIBILITY, {
				completionScore: 90,
				lastActivity: new Date().toISOString(),
				technologiesValidated: 3,
				totalTechnologies: 3,
				architectureValidated: true
			});

			// Step 6: Synthesize requirements
			const requirementsData = {
				problemStatement: 'Small businesses need an affordable, easy-to-use e-commerce platform',
				targetUsers: ['Small business owners', 'Online retailers', 'Digital marketers'],
				successCriteria: ['Increase sales by 30%', 'Reduce setup time to 1 hour', 'Achieve 99.9% uptime'],
				functionalRequirements: [
					{
						id: 'FR-001',
						title: 'Product Catalog Management',
						description: 'Users can add, edit, and organize products with images and descriptions',
						priority: 'HIGH',
						userStory: 'As a store owner, I want to manage my product catalog so that customers can browse and purchase items'
					},
					{
						id: 'FR-002',
						title: 'Shopping Cart and Checkout',
						description: 'Customers can add items to cart and complete secure checkout process',
						priority: 'HIGH',
						userStory: 'As a customer, I want to easily purchase products so that I can complete my shopping efficiently'
					},
					{
						id: 'FR-003',
						title: 'Payment Processing',
						description: 'Support multiple payment methods including credit cards and digital wallets',
						priority: 'HIGH',
						userStory: 'As a customer, I want multiple payment options so that I can pay using my preferred method'
					},
					{
						id: 'FR-004',
						title: 'Order Management',
						description: 'Store owners can view, process, and track customer orders',
						priority: 'MEDIUM',
						userStory: 'As a store owner, I want to manage orders efficiently so that I can fulfill customer purchases'
					},
					{
						id: 'FR-005',
						title: 'Customer Accounts',
						description: 'Customers can create accounts to track orders and save preferences',
						priority: 'MEDIUM',
						userStory: 'As a customer, I want to create an account so that I can track my orders and save my information'
					}
				],
				nonFunctionalRequirements: [
					{
						id: 'NFR-001',
						category: 'Performance',
						description: 'Page load times must be under 3 seconds',
						priority: 'HIGH',
						acceptanceCriteria: 'All pages load within 3 seconds on standard broadband connection'
					},
					{
						id: 'NFR-002',
						category: 'Security',
						description: 'All payment data must be encrypted and PCI DSS compliant',
						priority: 'HIGH',
						acceptanceCriteria: 'Pass PCI DSS compliance audit'
					},
					{
						id: 'NFR-003',
						category: 'Usability',
						description: 'Interface must be intuitive for non-technical users',
						priority: 'MEDIUM',
						acceptanceCriteria: 'New users can set up store within 1 hour without training'
					}
				]
			};

			await sessionManager.updateStageProgress(testSessionId, DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS, {
				completionScore: 100,
				lastActivity: new Date().toISOString(),
				requirementsSynthesized: true,
				functionalRequirementsCount: requirementsData.functionalRequirements.length,
				nonFunctionalRequirementsCount: requirementsData.nonFunctionalRequirements.length,
				data: requirementsData
			});

			// Step 7: Generate PRD
			const discoverySession = await sessionManager.getSession(testSessionId);
			expect(discoverySession).toBeDefined();

			const prdResult = await prdGenerator.generatePRD(discoverySession, {
				templateType: 'COMPREHENSIVE',
				includeResearchData: true,
				aiEnhancement: true
			});

			expect(prdResult.success).toBe(true);
			expect(prdResult.prd).toBeDefined();
			expect(prdResult.prd.content).toContain('E-commerce Platform');
			expect(prdResult.prd.content).toContain('Product Requirements Document');
			expect(prdResult.qualityAssessment).toBeDefined();

			// Step 8: Assess PRD quality
			const qualityResult = qualityAssessor.assessPRDQuality(
				prdResult.prd.content,
				discoverySession,
				prdResult.prd.structure
			);

			expect(qualityResult.overallScore).toBeGreaterThan(0);
			expect(qualityResult.qualityLevel).toBeDefined();
			expect(qualityResult.criteriaScores).toBeDefined();
			expect(qualityResult.readinessMetrics).toBeDefined();

			// Verify quality criteria
			expect(qualityResult.criteriaScores).toHaveProperty('completeness');
			expect(qualityResult.criteriaScores).toHaveProperty('clarity');
			expect(qualityResult.criteriaScores).toHaveProperty('technical-feasibility');
			expect(qualityResult.criteriaScores).toHaveProperty('market-validation');
			expect(qualityResult.criteriaScores).toHaveProperty('requirements-coverage');

			// Verify readiness metrics
			expect(qualityResult.readinessMetrics).toHaveProperty('readyForDevelopment');
			expect(qualityResult.readinessMetrics).toHaveProperty('readyForTaskGeneration');
			expect(qualityResult.readinessMetrics).toHaveProperty('confidenceLevel');

			console.log('✅ Complete workflow test passed');
			console.log(`📊 PRD Quality Score: ${qualityResult.overallScore}/100`);
			console.log(`🎯 Quality Level: ${qualityResult.qualityLevel}`);
			console.log(`🚀 Ready for Development: ${qualityResult.readinessMetrics.readyForDevelopment}`);
		}, 30000); // 30 second timeout for complete workflow

		test('should handle workflow with minimal requirements', async () => {
			// Test minimal viable workflow
			const minimalSession = await sessionManager.createSession('Simple Blog', {
				techStack: ['HTML', 'CSS', 'JavaScript'],
				businessGoals: ['Share content online']
			});

			expect(minimalSession.success).toBe(true);
			const sessionId = minimalSession.session.sessionId;

			// Add minimal requirements
			const minimalRequirements = {
				problemStatement: 'Need a simple blog to share content',
				targetUsers: ['Content creators'],
				successCriteria: ['Publish articles easily'],
				functionalRequirements: [
					{
						id: 'FR-001',
						title: 'Create Posts',
						description: 'Users can create and publish blog posts',
						priority: 'HIGH'
					},
					{
						id: 'FR-002',
						title: 'View Posts',
						description: 'Visitors can read published blog posts',
						priority: 'HIGH'
					},
					{
						id: 'FR-003',
						title: 'Manage Content',
						description: 'Authors can edit and delete their posts',
						priority: 'MEDIUM'
					}
				],
				nonFunctionalRequirements: [
					{
						id: 'NFR-001',
						category: 'Performance',
						description: 'Fast page loading',
						priority: 'MEDIUM'
					}
				]
			};

			await sessionManager.updateStageProgress(sessionId, DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS, {
				completionScore: 100,
				lastActivity: new Date().toISOString(),
				requirementsSynthesized: true,
				functionalRequirementsCount: minimalRequirements.functionalRequirements.length,
				nonFunctionalRequirementsCount: minimalRequirements.nonFunctionalRequirements.length,
				data: minimalRequirements
			});

			const session = await sessionManager.getSession(sessionId);
			const prdResult = await prdGenerator.generatePRD(session, {
				templateType: 'MINIMAL'
			});

			expect(prdResult.success).toBe(true);
			expect(prdResult.prd.content).toContain('Simple Blog');

			console.log('✅ Minimal workflow test passed');
		}, 15000);

		test('should validate session state persistence', async () => {
			// Test that session state is properly persisted and retrieved
			const session = await sessionManager.getSession(testSessionId);
			
			expect(session).toBeDefined();
			expect(session.sessionId).toBe(testSessionId);
			expect(session.projectName).toBe('E-commerce Platform');
			expect(session.progress).toBeDefined();
			expect(session.researchData).toBeDefined();

			// Verify research data persistence
			expect(session.researchData.marketAnalysis).toBeDefined();
			expect(session.researchData.technicalValidation).toBeDefined();
			expect(session.researchData.marketAnalysis.length).toBeGreaterThan(0);
			expect(session.researchData.technicalValidation.length).toBeGreaterThan(0);

			// Verify stage progress persistence
			expect(session.progress[DISCOVERY_STAGES.MARKET_RESEARCH]).toBeDefined();
			expect(session.progress[DISCOVERY_STAGES.TECHNICAL_FEASIBILITY]).toBeDefined();
			expect(session.progress[DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS]).toBeDefined();

			console.log('✅ Session persistence test passed');
		});

		test('should validate quality assessment accuracy', async () => {
			// Test quality assessment with known good and poor content
			const goodPRD = `# E-commerce Platform - Product Requirements Document

## Executive Summary
This document outlines the requirements for a comprehensive e-commerce platform designed for small to medium businesses.

## Problem Statement
Small businesses need an affordable, easy-to-use e-commerce platform that enables them to sell products online effectively.

## Solution Overview
A web-based e-commerce platform with product management, shopping cart, payment processing, and order management capabilities.

## Functional Requirements
1. **Product Catalog Management** - Users can add, edit, and organize products
2. **Shopping Cart and Checkout** - Customers can purchase products securely
3. **Payment Processing** - Support multiple payment methods
4. **Order Management** - Track and fulfill customer orders
5. **Customer Accounts** - User registration and account management

## Non-Functional Requirements
1. **Performance** - Page load times under 3 seconds
2. **Security** - PCI DSS compliant payment processing
3. **Usability** - Intuitive interface for non-technical users

## Technical Specifications
- Frontend: React.js
- Backend: Node.js
- Database: PostgreSQL
- Architecture: Microservices with REST APIs

## Market Analysis
Target market includes small to medium businesses looking to establish online presence.
Competitive landscape includes Shopify, WooCommerce, and BigCommerce.`;

			const poorPRD = `# Simple App

This is an app.

## Features
- Does stuff
- Has things

## Requirements
- Must work
- Should be good`;

			const mockSession = {
				projectName: 'Test Project',
				progress: {
					'requirements-synthesis': {
						data: {
							functionalRequirements: [
								{ id: 'FR-001', title: 'Feature 1', description: 'Test feature', priority: 'HIGH' }
							],
							nonFunctionalRequirements: [
								{ id: 'NFR-001', category: 'Performance', description: 'Fast', priority: 'HIGH' }
							]
						}
					}
				}
			};

			const goodAssessment = qualityAssessor.assessPRDQuality(goodPRD, mockSession);
			const poorAssessment = qualityAssessor.assessPRDQuality(poorPRD, mockSession);

			// Good PRD should score higher than poor PRD
			expect(goodAssessment.overallScore).toBeGreaterThan(poorAssessment.overallScore);
			expect(goodAssessment.overallScore).toBeGreaterThan(PRD_QUALITY_THRESHOLDS.ACCEPTABLE);
			expect(poorAssessment.overallScore).toBeLessThan(PRD_QUALITY_THRESHOLDS.ACCEPTABLE);

			// Good PRD should have fewer gaps
			expect(goodAssessment.gaps.length).toBeLessThan(poorAssessment.gaps.length);

			console.log('✅ Quality assessment accuracy test passed');
			console.log(`📊 Good PRD Score: ${goodAssessment.overallScore}/100`);
			console.log(`📊 Poor PRD Score: ${poorAssessment.overallScore}/100`);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		test('should handle invalid session IDs gracefully', async () => {
			const invalidSessionId = 'invalid-session-id';
			const session = await sessionManager.getSession(invalidSessionId);
			expect(session).toBeNull();
		});

		test('should validate minimum requirements for PRD generation', async () => {
			const incompleteSession = await sessionManager.createSession('Incomplete Project');
			const sessionId = incompleteSession.session.sessionId;

			// Try to generate PRD without requirements synthesis
			const session = await sessionManager.getSession(sessionId);
			
			try {
				await prdGenerator.generatePRD(session);
				fail('Should have thrown error for incomplete session');
			} catch (error) {
				expect(error.message).toContain('Requirements synthesis must be completed');
			}
		});

		test('should handle empty or malformed PRD content', async () => {
			const emptyPRD = '';
			const malformedPRD = 'This is not a proper PRD format';

			const mockSession = { projectName: 'Test', progress: {} };

			const emptyAssessment = qualityAssessor.assessPRDQuality(emptyPRD, mockSession);
			const malformedAssessment = qualityAssessor.assessPRDQuality(malformedPRD, mockSession);

			expect(emptyAssessment.overallScore).toBeLessThan(20);
			expect(malformedAssessment.overallScore).toBeLessThan(40);
			expect(emptyAssessment.gaps.length).toBeGreaterThan(0);
			expect(malformedAssessment.gaps.length).toBeGreaterThan(0);
		});
	});
});
