/**
 * tests/integration/discovery-components.test.js
 * Integration testing of discovery components
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { DiscoverySessionManager } from '../../mcp-server/src/core/discovery/discovery-session-manager.js';
import { PRDGenerator } from '../../mcp-server/src/core/discovery/prd-generator.js';
import { QualityAssessor } from '../../mcp-server/src/core/discovery/quality-assessor.js';
import { 
	selectPRDTemplate, 
	generateTemplatePlaceholders 
} from '../../mcp-server/src/core/discovery/prd-templates.js';
import { 
	DISCOVERY_STAGES, 
	PRD_QUALITY_THRESHOLDS 
} from '../../mcp-server/src/core/discovery/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Discovery Components Integration Tests', () => {
	let testProjectRoot;
	let sessionManager;

	beforeAll(async () => {
		testProjectRoot = path.join(__dirname, '../fixtures/integration-test');
		await fs.mkdir(testProjectRoot, { recursive: true });
		await fs.mkdir(path.join(testProjectRoot, '.taskmaster'), { recursive: true });
		sessionManager = new DiscoverySessionManager(testProjectRoot);
	});

	afterAll(async () => {
		try {
			await fs.rm(testProjectRoot, { recursive: true, force: true });
		} catch (error) {
			console.warn('Cleanup warning:', error.message);
		}
	});

	describe('DiscoverySessionManager', () => {
		test('should create and manage discovery sessions', async () => {
			const result = await sessionManager.createSession('Test Project', {
				techStack: ['React', 'Node.js'],
				businessGoals: ['Test goal']
			});

			expect(result.success).toBe(true);
			expect(result.session).toBeDefined();
			expect(result.session.projectName).toBe('Test Project');
			expect(result.session.sessionId).toBeDefined();

			// Test session retrieval
			const retrieved = await sessionManager.getSession(result.session.sessionId);
			expect(retrieved).toBeDefined();
			expect(retrieved.projectName).toBe('Test Project');
		});

		test('should add and retrieve research data', async () => {
			const session = await sessionManager.createSession('Research Test');
			const sessionId = session.session.sessionId;

			await sessionManager.addResearchData(sessionId, 'marketAnalysis', {
				query: 'test query',
				results: { summary: 'test results' }
			});

			const retrieved = await sessionManager.getSession(sessionId);
			expect(retrieved.researchData.marketAnalysis).toBeDefined();
			expect(retrieved.researchData.marketAnalysis.length).toBe(1);
			expect(retrieved.researchData.marketAnalysis[0].query).toBe('test query');
		});

		test('should update stage progress', async () => {
			const session = await sessionManager.createSession('Progress Test');
			const sessionId = session.session.sessionId;

			await sessionManager.updateStageProgress(sessionId, DISCOVERY_STAGES.MARKET_RESEARCH, {
				completionScore: 75,
				lastActivity: new Date().toISOString()
			});

			const retrieved = await sessionManager.getSession(sessionId);
			expect(retrieved.progress[DISCOVERY_STAGES.MARKET_RESEARCH]).toBeDefined();
			expect(retrieved.progress[DISCOVERY_STAGES.MARKET_RESEARCH].completionScore).toBe(75);
		});
	});

	describe('PRD Template System', () => {
		test('should select appropriate templates based on project characteristics', () => {
			// Test comprehensive template selection
			const comprehensiveProject = {
				complexity: 'high',
				projectType: 'web application',
				requirementsCount: 15
			};
			const comprehensiveTemplate = selectPRDTemplate(comprehensiveProject);
			expect(comprehensiveTemplate.name).toBe('Comprehensive PRD');

			// Test minimal template selection
			const minimalProject = {
				complexity: 'low',
				projectType: 'tool',
				requirementsCount: 3
			};
			const minimalTemplate = selectPRDTemplate(minimalProject);
			expect(minimalTemplate.name).toBe('Minimal PRD');

			// Test technical template selection
			const technicalProject = {
				complexity: 'medium',
				projectType: 'api service',
				requirementsCount: 8
			};
			const technicalTemplate = selectPRDTemplate(technicalProject);
			expect(technicalTemplate.name).toBe('Technical-Focused PRD');
		});

		test('should generate template placeholders from discovery data', () => {
			const discoveryData = {
				projectName: 'Test Project',
				metadata: {
					userPreferences: {
						techStack: ['React', 'Node.js'],
						businessGoals: ['Goal 1', 'Goal 2'],
						constraints: ['Budget: $10k']
					}
				},
				progress: {
					'requirements-synthesis': {
						data: {
							problemStatement: 'Test problem',
							targetUsers: ['User 1', 'User 2'],
							functionalRequirements: [
								{ id: 'FR-001', title: 'Feature 1', description: 'Test feature' }
							]
						}
					}
				}
			};

			const placeholders = generateTemplatePlaceholders(discoveryData);
			
			expect(placeholders.projectName).toBe('Test Project');
			expect(placeholders.problemStatement).toBe('Test problem');
			expect(placeholders.technologyStack).toBe('React, Node.js');
			expect(placeholders.businessObjectives).toContain('Goal 1');
			expect(placeholders.functionalRequirements).toContain('Feature 1');
		});
	});

	describe('PRDGenerator', () => {
		test('should generate PRD from discovery session', async () => {
			const generator = new PRDGenerator();
			
			// Create a complete discovery session
			const session = await sessionManager.createSession('PRD Test Project', {
				techStack: ['React', 'Node.js', 'PostgreSQL'],
				businessGoals: ['Improve efficiency', 'Reduce costs']
			});
			const sessionId = session.session.sessionId;

			// Add requirements synthesis data
			const requirementsData = {
				problemStatement: 'Need a better project management tool',
				targetUsers: ['Project managers', 'Team members'],
				successCriteria: ['Increase productivity by 25%'],
				functionalRequirements: [
					{
						id: 'FR-001',
						title: 'Task Management',
						description: 'Users can create and manage tasks',
						priority: 'HIGH',
						userStory: 'As a user, I want to manage tasks so that I can track progress'
					},
					{
						id: 'FR-002',
						title: 'Team Collaboration',
						description: 'Team members can collaborate on projects',
						priority: 'MEDIUM'
					},
					{
						id: 'FR-003',
						title: 'Reporting',
						description: 'Generate project reports and analytics',
						priority: 'LOW'
					}
				],
				nonFunctionalRequirements: [
					{
						id: 'NFR-001',
						category: 'Performance',
						description: 'System must respond within 2 seconds',
						priority: 'HIGH'
					},
					{
						id: 'NFR-002',
						category: 'Security',
						description: 'Data must be encrypted at rest and in transit',
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

			const discoverySession = await sessionManager.getSession(sessionId);
			const result = await generator.generatePRD(discoverySession, {
				templateType: 'COMPREHENSIVE',
				includeResearchData: false
			});

			expect(result.success).toBe(true);
			expect(result.prd).toBeDefined();
			expect(result.prd.content).toContain('PRD Test Project');
			expect(result.prd.content).toContain('Product Requirements Document');
			expect(result.prd.content).toContain('Task Management');
			expect(result.prd.content).toContain('Team Collaboration');
			expect(result.qualityAssessment).toBeDefined();
			expect(result.qualityAssessment.overallScore).toBeGreaterThan(0);
		});

		test('should validate session readiness before PRD generation', async () => {
			const generator = new PRDGenerator();
			
			// Create incomplete session
			const session = await sessionManager.createSession('Incomplete Project');
			const discoverySession = await sessionManager.getSession(session.session.sessionId);

			try {
				await generator.generatePRD(discoverySession);
				fail('Should have thrown error for incomplete session');
			} catch (error) {
				expect(error.message).toContain('Requirements synthesis must be completed');
			}
		});
	});

	describe('QualityAssessor', () => {
		test('should assess PRD quality with detailed criteria', () => {
			const assessor = new QualityAssessor();
			
			const samplePRD = `# Project Management Tool - Product Requirements Document

## Executive Summary
This document outlines requirements for a comprehensive project management tool.

## Problem Statement
Teams need better tools to manage projects and collaborate effectively.

## Solution Overview
A web-based project management platform with task management, team collaboration, and reporting features.

## Functional Requirements
1. **Task Management** - Users can create, assign, and track tasks
2. **Team Collaboration** - Real-time collaboration features
3. **Project Reporting** - Generate detailed project reports
4. **User Management** - Admin can manage team members
5. **File Sharing** - Share documents and files within projects

## Non-Functional Requirements
1. **Performance** - System must respond within 2 seconds
2. **Security** - Data encryption and secure authentication
3. **Usability** - Intuitive interface for all user types

## Technical Specifications
- Frontend: React.js with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
- Architecture: Microservices with REST APIs

## Market Analysis
Target market includes small to medium businesses and development teams.`;

			const mockSession = {
				projectName: 'Project Management Tool',
				progress: {
					'requirements-synthesis': {
						data: {
							functionalRequirements: [
								{ id: 'FR-001', title: 'Task Management', description: 'Manage tasks' },
								{ id: 'FR-002', title: 'Collaboration', description: 'Team features' }
							],
							nonFunctionalRequirements: [
								{ id: 'NFR-001', category: 'Performance', description: 'Fast response' }
							]
						}
					}
				}
			};

			const assessment = assessor.assessPRDQuality(samplePRD, mockSession);

			expect(assessment.overallScore).toBeGreaterThan(50);
			expect(assessment.qualityLevel).toBeDefined();
			expect(assessment.criteriaScores).toBeDefined();
			expect(assessment.criteriaScores.completeness).toBeGreaterThan(0);
			expect(assessment.criteriaScores.clarity).toBeGreaterThan(0);
			expect(assessment.readinessMetrics).toBeDefined();
			expect(assessment.readinessMetrics.confidenceLevel).toBeDefined();
		});

		test('should provide improvement recommendations', () => {
			const assessor = new QualityAssessor();
			
			const poorPRD = `# Simple App
			
This is a basic app that does things.

## Features
- Feature 1
- Feature 2

## Requirements
- Must work
- Should be fast`;

			const mockSession = {
				projectName: 'Simple App',
				progress: {}
			};

			const assessment = assessor.assessPRDQuality(poorPRD, mockSession);

			expect(assessment.overallScore).toBeLessThan(PRD_QUALITY_THRESHOLDS.ACCEPTABLE);
			expect(assessment.gaps.length).toBeGreaterThan(0);
			expect(assessment.recommendations.length).toBeGreaterThan(0);
			expect(assessment.readinessMetrics.readyForDevelopment).toBe(false);
		});
	});

	describe('Component Integration', () => {
		test('should work together in sequence', async () => {
			// 1. Create session
			const sessionResult = await sessionManager.createSession('Integration Test', {
				techStack: ['Vue.js', 'Python', 'MySQL'],
				businessGoals: ['Streamline operations']
			});
			const sessionId = sessionResult.session.sessionId;

			// 2. Add research data
			await sessionManager.addResearchData(sessionId, 'marketAnalysis', {
				query: 'market research',
				results: { summary: 'positive market outlook' }
			});

			// 3. Add requirements
			const requirements = {
				problemStatement: 'Integration test problem',
				targetUsers: ['Test users'],
				successCriteria: ['Test success'],
				functionalRequirements: [
					{ id: 'FR-001', title: 'Test Feature', description: 'Test description', priority: 'HIGH' },
					{ id: 'FR-002', title: 'Another Feature', description: 'Another description', priority: 'MEDIUM' },
					{ id: 'FR-003', title: 'Third Feature', description: 'Third description', priority: 'LOW' }
				],
				nonFunctionalRequirements: [
					{ id: 'NFR-001', category: 'Performance', description: 'Fast performance', priority: 'HIGH' }
				]
			};

			await sessionManager.updateStageProgress(sessionId, DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS, {
				completionScore: 100,
				data: requirements
			});

			// 4. Generate PRD
			const session = await sessionManager.getSession(sessionId);
			const generator = new PRDGenerator();
			const prdResult = await generator.generatePRD(session);

			// 5. Assess quality
			const assessor = new QualityAssessor();
			const qualityResult = assessor.assessPRDQuality(prdResult.prd.content, session);

			// Verify integration
			expect(sessionResult.success).toBe(true);
			expect(prdResult.success).toBe(true);
			expect(qualityResult.overallScore).toBeGreaterThan(0);
			expect(prdResult.prd.content).toContain('Integration Test');
			expect(qualityResult.assessmentDetails.requirementsCount).toBeGreaterThan(0);

			console.log('✅ Component integration test passed');
			console.log(`📊 Final Quality Score: ${qualityResult.overallScore}/100`);
		});
	});
});
