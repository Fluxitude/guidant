/**
 * tests/phase2-integration.test.js
 * Integration tests for Phase 2: Research Provider Integration
 */

import { TavilyProvider } from '../src/ai-providers/tavily.js';
import { Context7Provider } from '../src/ai-providers/context7.js';
import { ResearchRouter } from '../mcp-server/src/core/discovery/research-router.js';
import { RESEARCH_PROVIDERS, DISCOVERY_STAGES } from '../mcp-server/src/core/discovery/constants.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Phase 2 Integration Tests', () => {
	let researchRouter;
	let tavilyProvider;
	let context7Provider;

	beforeEach(() => {
		researchRouter = new ResearchRouter();
		tavilyProvider = new TavilyProvider();
		context7Provider = new Context7Provider();

		// Mock external dependencies
		global.fetch = vi.fn();
		
		// Register providers with router
		researchRouter.registerProvider(RESEARCH_PROVIDERS.TAVILY, tavilyProvider);
		researchRouter.registerProvider(RESEARCH_PROVIDERS.CONTEXT7, context7Provider);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Provider Integration with Router', () => {
		it('should integrate Tavily provider with router for market research', async () => {
			// Mock Tavily API response
			global.fetch.mockResolvedValueOnce({
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
			expect(result.results.technologies).toEqual(['react', 'node.js']);
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
			expect(results[0].provider).toBe(RESEARCH_PROVIDERS.TAVILY); // Market query
			expect(results[1].provider).toBe(RESEARCH_PROVIDERS.CONTEXT7); // Technical query
			expect(results[2].provider).toBe(RESEARCH_PROVIDERS.TAVILY); // Competitive query
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

			await expect(researchRouter.routeQuery(query, context))
				.rejects.toThrow();
		});

		it('should use fallback routing when primary provider fails', async () => {
			// Mock Tavily to be unavailable
			vi.spyOn(tavilyProvider, 'isAvailable').mockResolvedValueOnce(false);

			// Add a mock Perplexity provider for fallback
			const mockPerplexity = {
				generateText: vi.fn().mockResolvedValue({ text: 'Fallback response' }),
				isAvailable: vi.fn().mockResolvedValue(true)
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
			expect(explanation).toContain('library documentation');
		});
	});
});
