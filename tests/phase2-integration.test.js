/**
 * tests/phase2-integration.test.js
 * Integration tests for Phase 2: Research Provider Integration
 */

import { TavilyProvider } from '../src/ai-providers/tavily.js';
import { Context7Provider } from '../src/ai-providers/context7.js';
import { ResearchRouter } from '../mcp-server/src/core/discovery/research-router.js';
import { RESEARCH_PROVIDERS, DISCOVERY_STAGES } from '../mcp-server/src/core/discovery/constants.js';
import { jest } from '@jest/globals';

describe('Phase 2 Integration Tests', () => {
	let researchRouter;
	let tavilyProvider;
	let context7Provider;

	beforeEach(() => {
		researchRouter = new ResearchRouter();
		tavilyProvider = new TavilyProvider();
		context7Provider = new Context7Provider();

		// Mock external dependencies
		global.fetch = jest.fn();
		
		// Register providers with router
		researchRouter.registerProvider(RESEARCH_PROVIDERS.TAVILY, tavilyProvider);
		researchRouter.registerProvider(RESEARCH_PROVIDERS.CONTEXT7, context7Provider);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('Provider Integration with Router', () => {
		it('should integrate Tavily provider with router for market research', async () => {
			// Mock Tavily API response for multiple calls (market research makes several search calls)
			global.fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					query: 'fintech market analysis',
					answer: 'The fintech market is growing rapidly...',
					results: [
						{
							title: 'Fintech Market Report 2024',
							url: 'https://example.com/report',
							content: 'Market analysis content...'
						}
					]
				})
			});

			const query = 'fintech market analysis and opportunities';
			const context = {
				apiKey: 'test-tavily-key',
				stage: DISCOVERY_STAGES.MARKET_RESEARCH,
				projectType: 'fintech app'
			};

			const result = await researchRouter.routeQuery(query, context);

			expect(result.provider).toBe(RESEARCH_PROVIDERS.TAVILY);
			expect(result.results).toBeDefined();
			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.tavily.com/search',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				})
			);
		});

		it('should integrate Context7 provider with router for technical queries', async () => {
			const query = 'React framework technical implementation';
			const context = {
				stage: DISCOVERY_STAGES.TECHNICAL_FEASIBILITY,
				technologies: ['react', 'node.js'],
				projectType: 'web application'
			};

			const result = await researchRouter.routeQuery(query, context);

			expect(result.provider).toBe(RESEARCH_PROVIDERS.CONTEXT7);
			expect(result.results).toBeDefined();
			expect(result.results.feasible).toBe(true);
			expect(result.results.confidence).toBeGreaterThan(80);
			expect(result.results.technologies).toHaveLength(2);
			expect(result.results.technologies[0].technology).toBe('react');
			expect(result.results.technologies[1].technology).toBe('node.js');
			expect(result.results.source).toBe('hybrid-context7-ai');
		});
	});

	describe('Discovery Workflow Simulation', () => {
		it('should simulate complete discovery research workflow', async () => {
			// Mock Tavily responses for market research
			global.fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					query: 'test',
					answer: 'Market research results',
					results: [{ title: 'Market Report', url: 'https://example.com' }]
				})
			});

			// Simulate discovery session data
			const discoverySession = {
				projectName: 'TaskFlow Pro',
				projectType: 'productivity app',
				targetMarket: 'small business',
				competitors: ['Asana', 'Trello'],
				features: ['task management', 'team collaboration'],
				technologies: ['react', 'node.js', 'mongodb']
			};

			// Step 1: Market Research
			const marketQuery = `${discoverySession.projectType} market analysis for ${discoverySession.targetMarket}`;
			const marketContext = {
				apiKey: 'test-key',
				stage: DISCOVERY_STAGES.MARKET_RESEARCH,
				projectType: discoverySession.projectType,
				targetMarket: discoverySession.targetMarket,
				competitors: discoverySession.competitors
			};

			const marketResult = await researchRouter.routeQuery(marketQuery, marketContext);
			expect(marketResult.provider).toBe(RESEARCH_PROVIDERS.TAVILY);

			// Step 2: Technical Feasibility
			const techQuery = `technical feasibility for ${discoverySession.technologies.join(', ')} stack`;
			const techContext = {
				stage: DISCOVERY_STAGES.TECHNICAL_FEASIBILITY,
				technologies: discoverySession.technologies,
				projectType: discoverySession.projectType
			};

			const techResult = await researchRouter.routeQuery(techQuery, techContext);
			expect(techResult.provider).toBe(RESEARCH_PROVIDERS.CONTEXT7);

			// Step 3: Competitive Analysis
			const compQuery = `competitive analysis for ${discoverySession.competitors.join(' vs ')}`;
			const compContext = {
				apiKey: 'test-key',
				focus: 'competitive',
				competitors: discoverySession.competitors
			};

			const compResult = await researchRouter.routeQuery(compQuery, compContext);
			expect(compResult.provider).toBe(RESEARCH_PROVIDERS.TAVILY);

			// Verify all research completed
			expect(marketResult.results).toBeDefined();
			expect(techResult.results).toBeDefined();
			expect(compResult.results).toBeDefined();
		});

		it('should handle batch research queries for discovery', async () => {
			global.fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					query: 'test',
					answer: 'Research results',
					results: []
				})
			});

			// Ensure Context7 is available and working with updated return structure
			jest.spyOn(context7Provider, 'isAvailable').mockResolvedValue(true);
			jest.spyOn(context7Provider, 'validateTechnicalFeasibility').mockResolvedValue({
				feasible: true,
				confidence: 88,
				confidenceLevel: 'high',
				technologies: [
					{
						technology: 'react',
						feasible: true,
						confidence: { score: 90, level: 'very-high', source: 'context7' },
						recommendations: ['React has excellent Context7 documentation'],
						warnings: [],
						alternatives: []
					},
					{
						technology: 'node.js',
						feasible: true,
						confidence: { score: 85, level: 'high', source: 'hybrid' },
						recommendations: ['Node.js is well-supported'],
						warnings: [],
						alternatives: []
					},
					{
						technology: 'mongodb',
						feasible: true,
						confidence: { score: 88, level: 'high', source: 'context7' },
						recommendations: ['MongoDB has comprehensive documentation'],
						warnings: [],
						alternatives: []
					}
				],
				assessment: {
					feasible: true,
					summary: 'All technologies are feasible for the project',
					recommendations: ['Use latest versions', 'Follow best practices'],
					warnings: [],
					riskLevel: 'low'
				},
				source: 'hybrid-context7-ai'
			});

			// Also mock the provider adapter's isAvailable method
			const context7Adapter = researchRouter.providers.get(RESEARCH_PROVIDERS.CONTEXT7);
			if (context7Adapter) {
				jest.spyOn(context7Adapter, 'isAvailable').mockResolvedValue(true);
			}

			const discoveryQueries = [
				{
					query: 'productivity app market size 2024',
					context: { 
						apiKey: 'test-key',
						stage: DISCOVERY_STAGES.MARKET_RESEARCH 
					}
				},
				{
					query: 'React Node.js MongoDB architecture best practices',
					context: { 
						stage: DISCOVERY_STAGES.TECHNICAL_FEASIBILITY,
						technologies: ['react', 'node.js', 'mongodb']
					}
				},
				{
					query: 'Asana vs Trello feature comparison',
					context: { 
						apiKey: 'test-key',
						focus: 'competitive'
					}
				}
			];

			const results = await researchRouter.routeBatch(discoveryQueries);

			expect(results).toHaveLength(3);

			// Find results by query content since batch processing may change order
			const marketResult = results.find(r => r.query.includes('market size'));
			const technicalResult = results.find(r => r.query.includes('architecture best practices'));
			const competitiveResult = results.find(r => r.query.includes('vs'));

			expect(marketResult.provider).toBe(RESEARCH_PROVIDERS.TAVILY);
			expect(technicalResult.provider).toBe(RESEARCH_PROVIDERS.CONTEXT7);
			expect(competitiveResult.provider).toBe(RESEARCH_PROVIDERS.TAVILY);
		});
	});

	describe('Provider Configuration Integration', () => {
		it('should validate provider configurations', () => {
			// Test Tavily configuration
			expect(() => tavilyProvider.validateAuth({})).toThrow();
			expect(() => tavilyProvider.validateAuth({ apiKey: 'test-key' })).not.toThrow();

			// Test Context7 configuration (no API key needed)
			expect(context7Provider.validateAuth({})).toBe(true);

			// Test provider types
			expect(tavilyProvider.type).toBe('api-based');
			expect(context7Provider.type).toBe('mcp-based');
		});

		it('should provide correct supported categories', () => {
			const tavilyCategories = tavilyProvider.getSupportedCategories();
			const context7Categories = context7Provider.getSupportedCategories();

			expect(tavilyCategories).toContain('market-research');
			expect(tavilyCategories).toContain('competitive-analysis');
			
			expect(context7Categories).toContain('frontend-frameworks');
			expect(context7Categories).toContain('backend-frameworks');
		});
	});

	describe('Error Handling and Fallbacks', () => {
		it('should handle Tavily API failures gracefully', async () => {
			global.fetch.mockRejectedValueOnce(new Error('Network error'));

			const query = 'market research query';
			const context = { apiKey: 'test-key' };

			// Should fallback to Context7 when Tavily fails
			const result = await researchRouter.routeQuery(query, context);
			expect(result.provider).toBe(RESEARCH_PROVIDERS.CONTEXT7);
			expect(result.metadata.routingDecision).toContain('Fallback');
		});

		it('should use fallback routing when primary provider fails', async () => {
			// Mock Tavily to be unavailable
			jest.spyOn(tavilyProvider, 'isAvailable').mockResolvedValueOnce(false);

			// Add a mock Perplexity provider for fallback
			const mockPerplexity = {
				generateText: jest.fn().mockResolvedValue({ text: 'Fallback response' }),
				isAvailable: jest.fn().mockResolvedValue(true)
			};
			researchRouter.registerProvider(RESEARCH_PROVIDERS.PERPLEXITY, mockPerplexity);

			const query = 'market research query';
			const context = { apiKey: 'test-key' };

			const result = await researchRouter.routeQuery(query, context);
			
			expect(result.provider).toBe(RESEARCH_PROVIDERS.PERPLEXITY);
			expect(result.metadata.routingDecision).toContain('Fallback');
		});
	});

	describe('Performance and Efficiency', () => {
		it('should efficiently route queries based on content analysis', () => {
			const testCases = [
				{ query: 'React component architecture', expectedProvider: RESEARCH_PROVIDERS.CONTEXT7 },
				{ query: 'market size for mobile apps', expectedProvider: RESEARCH_PROVIDERS.TAVILY },
				{ query: 'competitor pricing analysis', expectedProvider: RESEARCH_PROVIDERS.TAVILY },
				{ query: 'database schema design', expectedProvider: RESEARCH_PROVIDERS.CONTEXT7 }
			];

			testCases.forEach(({ query, expectedProvider }) => {
				const queryType = researchRouter.classifyQuery(query);
				const selectedProvider = researchRouter.selectProvider(queryType);
				expect(selectedProvider).toBe(expectedProvider);
			});
		});

		it('should provide routing explanations for transparency', () => {
			const query = 'React framework implementation';
			const queryType = researchRouter.classifyQuery(query);
			const provider = researchRouter.selectProvider(queryType);
			const explanation = researchRouter.explainRoutingDecision(queryType, provider);

			expect(explanation).toContain('Technical query');
			expect(explanation).toContain('context7');
			expect(explanation).toContain('documentation and feasibility analysis');
		});
	});
});
