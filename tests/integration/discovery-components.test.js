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
		// Create base test directory
		testProjectRoot = path.join(__dirname, '../fixtures/integration-test');
		await fs.mkdir(testProjectRoot, { recursive: true });
	});

	beforeEach(async () => {
		// Create a unique test directory for each test to avoid session conflicts
		const uniqueTestDir = path.join(testProjectRoot, `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
		await fs.mkdir(uniqueTestDir, { recursive: true });
		await fs.mkdir(path.join(uniqueTestDir, '.guidant'), { recursive: true });

		// Create a new session manager for each test
		sessionManager = new DiscoverySessionManager(uniqueTestDir);
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
				provider: 'tavily',
				queryType: 'market',
				success: true,
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

			await sessionManager.completeStage(sessionId, DISCOVERY_STAGES.MARKET_RESEARCH, {
				lastActivity: new Date().toISOString()
			}, 75);

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
					'problem-discovery': {
						data: {
							problemStatement: 'Test problem',
							targetUsers: ['User 1', 'User 2']
						}
					},
					'requirements-synthesis': {
						data: {
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
						priority: 'high',
						userStory: 'As a user, I want to manage tasks so that I can track progress'
					},
					{
						id: 'FR-002',
						title: 'Team Collaboration',
						description: 'Team members can collaborate on projects',
						priority: 'medium'
					},
					{
						id: 'FR-003',
						title: 'Reporting',
						description: 'Generate project reports and analytics',
						priority: 'low'
					}
				],
				nonFunctionalRequirements: [
					{
						id: 'NFR-001',
						title: 'Performance Requirements',
						description: 'System must respond within 2 seconds',
						type: 'performance'
					},
					{
						id: 'NFR-002',
						title: 'Security Requirements',
						description: 'Data must be encrypted at rest and in transit',
						type: 'security'
					}
				]
			};

			// First update the stage with requirements data
			await sessionManager.updateSessionStage(sessionId, DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS, requirementsData);

			// Then complete the stage
			await sessionManager.completeStage(sessionId, DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS, {
				lastActivity: new Date().toISOString(),
				requirementsSynthesized: true,
				functionalRequirementsCount: requirementsData.functionalRequirements.length,
				nonFunctionalRequirementsCount: requirementsData.nonFunctionalRequirements.length
			}, 100);

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

			const result = await generator.generatePRD(discoverySession);

			// PRD generation should fail and return error object
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error.message).toContain('Requirements synthesis must be completed');
		});
	});

	describe('QualityAssessor', () => {
		test('should assess PRD quality with detailed criteria', () => {
			const assessor = new QualityAssessor();
			
			const samplePRD = `# Project Management Tool - Product Requirements Document

## Executive Summary
This document outlines requirements for a comprehensive project management tool designed to improve team productivity and project delivery success rates. The solution addresses critical gaps in current project management workflows through an integrated platform combining task management, real-time collaboration, and advanced reporting capabilities.

### Business Objectives
- Increase team productivity by 40%
- Reduce project delivery time by 25%
- Improve project success rate to 95%
- Enable seamless remote team collaboration

### Success Metrics
- User adoption rate > 80% within 3 months
- Task completion rate improvement > 30%
- Customer satisfaction score > 4.5/5

## Problem Statement
Current project management tools lack integration and fail to provide comprehensive visibility into project progress. Teams struggle with fragmented workflows, poor communication, and inadequate reporting capabilities, leading to project delays and budget overruns.

### Target Users
- Project managers and team leads
- Development teams and designers
- Stakeholders and executives
- Client-facing teams

## Solution Overview
A web-based project management platform that unifies task management, team collaboration, and project reporting in a single, intuitive interface. The solution provides real-time visibility, automated workflows, and comprehensive analytics.

### Key Features
- Intelligent task management with AI-powered scheduling
- Real-time collaboration workspace
- Advanced project analytics and reporting
- Customizable workflows and templates
- Integration with popular development tools

## Functional Requirements
1. **Task Management** (HIGH priority)
   - Create, assign, and track tasks with dependencies
   - Automated task scheduling and resource allocation
   - Progress tracking with visual indicators
   - Task templates for common workflows

2. **Team Collaboration** (HIGH priority)
   - Real-time messaging and file sharing
   - Collaborative document editing
   - Video conferencing integration
   - Activity feeds and notifications

3. **Project Reporting** (MEDIUM priority)
   - Customizable dashboards and reports
   - Time tracking and budget monitoring
   - Performance analytics and insights
   - Export capabilities (PDF, Excel, CSV)

4. **User Management** (HIGH priority)
   - Role-based access control
   - Team member onboarding workflows
   - Permission management
   - User activity monitoring

5. **Integration Capabilities** (MEDIUM priority)
   - API for third-party integrations
   - Popular tool connectors (Slack, GitHub, Jira)
   - Data import/export functionality
   - Webhook support for automation

## Non-Functional Requirements
1. **Performance** - System must respond within 2 seconds for 95% of requests
2. **Security** - SOC 2 compliant with end-to-end encryption
3. **Usability** - Intuitive interface requiring < 1 hour training
4. **Scalability** - Support 10,000+ concurrent users
5. **Reliability** - 99.9% uptime with automated failover

## Technical Specifications
- Frontend: React.js with TypeScript and Material-UI
- Backend: Node.js with Express and GraphQL
- Database: PostgreSQL with Redis caching
- Architecture: Microservices with Docker containers
- Infrastructure: AWS with auto-scaling capabilities
- Security: OAuth 2.0, JWT tokens, data encryption

## Market Analysis
Target market includes small to medium businesses (50-500 employees) and development teams seeking integrated project management solutions. Market size estimated at $4.3B with 15% annual growth. Key competitors include Asana, Monday.com, and Jira.

## Implementation Timeline
- Phase 1: Core features (3 months)
- Phase 2: Advanced features (2 months)
- Phase 3: Integrations and polish (1 month)
- Total development time: 6 months

## Success Criteria
- Technical: All functional requirements implemented
- Performance: Meets all non-functional requirements
- Business: Achieves target user adoption and satisfaction metrics
- Market: Competitive feature parity with market leaders`;

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
				provider: 'tavily',
				queryType: 'market',
				success: true,
				results: { summary: 'positive market outlook' }
			});

			// 3. Add requirements
			const requirements = {
				problemStatement: 'Integration test problem',
				targetUsers: ['Test users'],
				successCriteria: ['Test success'],
				functionalRequirements: [
					{ id: 'FR-001', title: 'Test Feature', description: 'Test description', priority: 'high' },
					{ id: 'FR-002', title: 'Another Feature', description: 'Another description', priority: 'medium' },
					{ id: 'FR-003', title: 'Third Feature', description: 'Third description', priority: 'low' }
				],
				nonFunctionalRequirements: [
					{ id: 'NFR-001', title: 'Performance Requirements', description: 'Fast performance', type: 'performance' }
				]
			};

			// First update the stage with requirements data
			await sessionManager.updateSessionStage(sessionId, DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS, requirements);

			// Then complete the stage
			await sessionManager.completeStage(sessionId, DISCOVERY_STAGES.REQUIREMENTS_SYNTHESIS, {
				lastActivity: new Date().toISOString()
			}, 100);

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
