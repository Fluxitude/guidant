/**
 * tests/research-router.test.js
 * Test suite for ResearchRouter functionality
 */

import { ResearchRouter } from '../mcp-server/src/core/discovery/research-router.js';
import { RESEARCH_PROVIDERS, RESEARCH_QUERY_TYPES, DISCOVERY_STAGES } from '../mcp-server/src/core/discovery/constants.js';
import { jest } from '@jest/globals';

describe('ResearchRouter', () => {
	let researchRouter;
	let mockContext7Provider;
	let mockTavilyProvider;
	let mockPerplexityProvider;

	beforeEach(() => {
		researchRouter = new ResearchRouter();

		// Create mock providers with updated return structures
		mockContext7Provider = {
			validateTechnicalFeasibility: jest.fn().mockResolvedValue({
				feasible: true,
				confidence: 85,
				confidenceLevel: 'high',
				technologies: [
					{
						technology: 'react',
						feasible: true,
						confidence: { score: 85, level: 'high', source: 'hybrid' },
						recommendations: ['React is well-documented and stable'],
						warnings: [],
						alternatives: []
					}
				],
				assessment: {
					feasible: true,
					summary: 'All technologies are feasible',
					recommendations: ['Use latest versions', 'Follow best practices'],
					warnings: [],
					riskLevel: 'low'
				},
				source: 'hybrid-context7-ai'
			}),
			getArchitectureRecommendations: jest.fn().mockResolvedValue({ recommendations: [] }),
			resolveLibraryId: jest.fn().mockResolvedValue({
				libraryId: 'test',
				available: true,
				source: 'context7'
			}),
			isAvailable: jest.fn().mockResolvedValue(true)
		};

		mockTavilyProvider = {
			researchMarketOpportunity: jest.fn().mockResolvedValue({ opportunities: [] }),
			search: jest.fn().mockResolvedValue({ results: [] }),
			isAvailable: jest.fn().mockResolvedValue(true)
		};

		mockPerplexityProvider = {
			generateText: jest.fn().mockResolvedValue({ text: 'Generated response' }),
			isAvailable: jest.fn().mockResolvedValue(true)
		};

		// Register mock providers
		researchRouter.registerProvider(RESEARCH_PROVIDERS.CONTEXT7, mockContext7Provider);
		researchRouter.registerProvider(RESEARCH_PROVIDERS.TAVILY, mockTavilyProvider);
		researchRouter.registerProvider(RESEARCH_PROVIDERS.PERPLEXITY, mockPerplexityProvider);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('Provider Registration', () => {
		it('should register providers successfully', () => {
			const stats = researchRouter.getRoutingStats();
			expect(stats.registeredProviders).toContain(RESEARCH_PROVIDERS.CONTEXT7);
			expect(stats.registeredProviders).toContain(RESEARCH_PROVIDERS.TAVILY);
			expect(stats.registeredProviders).toContain(RESEARCH_PROVIDERS.PERPLEXITY);
		});

		it('should throw error for unknown provider', () => {
			expect(() => {
				researchRouter.registerProvider('unknown-provider', {});
			}).toThrow('Unknown provider: unknown-provider');
		});
	});

	describe('Query Classification', () => {
		it('should classify technical queries correctly', () => {
			const technicalQueries = [
				'React framework implementation',
				'database architecture design',
				'API development best practices',
				'Node.js performance optimization'
			];

			technicalQueries.forEach(query => {
				const classification = researchRouter.classifyQuery(query);
				expect(classification).toBe(RESEARCH_QUERY_TYPES.TECHNICAL);
			});
		});

		it('should classify market queries correctly', () => {
			const marketQueries = [
				'competitor analysis for fintech',
				'market size for mobile apps',
				'pricing strategy for SaaS',
				'customer demand for e-commerce'
			];

			marketQueries.forEach(query => {
				const classification = researchRouter.classifyQuery(query);
				expect(classification).toBe(RESEARCH_QUERY_TYPES.MARKET);
			});
		});

		it('should classify based on context stage', () => {
			const query = 'general research query';
			
			const technicalContext = { stage: DISCOVERY_STAGES.TECHNICAL_FEASIBILITY };
			expect(researchRouter.classifyQuery(query, technicalContext))
				.toBe(RESEARCH_QUERY_TYPES.TECHNICAL);

			const marketContext = { stage: DISCOVERY_STAGES.MARKET_RESEARCH };
			expect(researchRouter.classifyQuery(query, marketContext))
				.toBe(RESEARCH_QUERY_TYPES.MARKET);
		});

		it('should classify hybrid queries', () => {
			const hybridQuery = 'React framework market analysis and technical implementation';
			const classification = researchRouter.classifyQuery(hybridQuery);
			expect(classification).toBe(RESEARCH_QUERY_TYPES.HYBRID);
		});

		it('should default to general for unclear queries', () => {
			const generalQuery = 'some random query';
			const classification = researchRouter.classifyQuery(generalQuery);
			expect(classification).toBe(RESEARCH_QUERY_TYPES.GENERAL);
		});
	});

	describe('Provider Selection', () => {
		it('should select Context7 for technical queries', () => {
			const provider = researchRouter.selectProvider(RESEARCH_QUERY_TYPES.TECHNICAL);
			expect(provider).toBe(RESEARCH_PROVIDERS.CONTEXT7);
		});

		it('should select Tavily for market queries', () => {
			const provider = researchRouter.selectProvider(RESEARCH_QUERY_TYPES.MARKET);
			expect(provider).toBe(RESEARCH_PROVIDERS.TAVILY);
		});

		it('should select Tavily for competitive queries', () => {
			const provider = researchRouter.selectProvider(RESEARCH_QUERY_TYPES.COMPETITIVE);
			expect(provider).toBe(RESEARCH_PROVIDERS.TAVILY);
		});

		it('should select Perplexity for general queries', () => {
			const provider = researchRouter.selectProvider(RESEARCH_QUERY_TYPES.GENERAL);
			expect(provider).toBe(RESEARCH_PROVIDERS.PERPLEXITY);
		});
	});

	describe('Query Routing', () => {
		it('should route technical query to Context7', async () => {
			const query = 'React framework implementation';
			const context = { technologies: ['react'] };

			const result = await researchRouter.routeQuery(query, context);

			expect(result.provider).toBe(RESEARCH_PROVIDERS.CONTEXT7);
			expect(result.queryType).toBe(RESEARCH_QUERY_TYPES.TECHNICAL);
			expect(result.query).toBe(query);
			expect(mockContext7Provider.validateTechnicalFeasibility).toHaveBeenCalled();
		});

		it('should route market query to Tavily', async () => {
			const query = 'market analysis for mobile apps';
			const context = { 
				apiKey: 'test-key',
				stage: DISCOVERY_STAGES.MARKET_RESEARCH,
				projectType: 'mobile app'
			};

			const result = await researchRouter.routeQuery(query, context);

			expect(result.provider).toBe(RESEARCH_PROVIDERS.TAVILY);
			expect(result.queryType).toBe(RESEARCH_QUERY_TYPES.MARKET);
			expect(mockTavilyProvider.researchMarketOpportunity).toHaveBeenCalled();
		});

		it('should route general query to Perplexity', async () => {
			const query = 'general information request';
			const context = { 
				apiKey: 'test-key',
				modelId: 'test-model'
			};

			const result = await researchRouter.routeQuery(query, context);

			expect(result.provider).toBe(RESEARCH_PROVIDERS.PERPLEXITY);
			expect(result.queryType).toBe(RESEARCH_QUERY_TYPES.GENERAL);
			expect(mockPerplexityProvider.generateText).toHaveBeenCalled();
		});

		it('should include routing metadata', async () => {
			const query = 'test query';
			const context = {};

			const result = await researchRouter.routeQuery(query, context);

			expect(result.metadata).toBeDefined();
			expect(result.metadata.routingDecision).toBeDefined();
			expect(result.metadata.timestamp).toBeDefined();
			expect(result.metadata.context).toEqual(context);
		});
	});

	describe('Batch Query Routing', () => {
		it('should route multiple queries efficiently', async () => {
			const queries = [
				{ query: 'React implementation', context: {} },
				{ query: 'market analysis', context: {} },
				{ query: 'general question', context: {} }
			];

			const results = await researchRouter.routeBatch(queries);

			expect(results).toHaveLength(3);
			expect(results[0].provider).toBe(RESEARCH_PROVIDERS.CONTEXT7);
			expect(results[1].provider).toBe(RESEARCH_PROVIDERS.TAVILY);
			expect(results[2].provider).toBe(RESEARCH_PROVIDERS.PERPLEXITY);
		});

		it('should handle batch query errors gracefully', async () => {
			mockContext7Provider.resolveLibraryId.mockRejectedValueOnce(
				new Error('Provider error')
			);

			const queries = [
				{ query: 'React implementation', context: {} }
			];

			const results = await researchRouter.routeBatch(queries);

			expect(results).toHaveLength(1);
			expect(results[0].error).toBeDefined();
			expect(results[0].error).toBe('Provider error');
		});
	});

	describe('Fallback Routing', () => {
		it('should use fallback when primary provider is unavailable', async () => {
			// Make Context7 unavailable
			mockContext7Provider.isAvailable.mockResolvedValueOnce(false);

			const query = 'React framework implementation';
			const context = {};

			const result = await researchRouter.routeQuery(query, context);

			// Should fallback to Tavily (first in fallback order)
			expect(result.provider).toBe(RESEARCH_PROVIDERS.TAVILY);
			expect(result.metadata.routingDecision).toContain('Fallback');
		});

		it('should throw error when all providers fail', async () => {
			// Make all providers unavailable
			mockContext7Provider.isAvailable.mockResolvedValue(false);
			mockTavilyProvider.isAvailable.mockResolvedValue(false);
			mockPerplexityProvider.isAvailable.mockResolvedValue(false);

			const query = 'test query';
			const context = {};

			await expect(researchRouter.routeQuery(query, context))
				.rejects.toThrow('All research providers failed or unavailable');
		});
	});

	describe('Provider Availability Checking', () => {
		it('should check Context7 availability', async () => {
			const isAvailable = await researchRouter.checkProviderAvailability(
				RESEARCH_PROVIDERS.CONTEXT7, 
				{}
			);
			expect(isAvailable).toBe(true);
			expect(mockContext7Provider.isAvailable).toHaveBeenCalled();
		});

		it('should check Tavily availability with API key', async () => {
			const context = { apiKey: 'test-key' };
			const isAvailable = await researchRouter.checkProviderAvailability(
				RESEARCH_PROVIDERS.TAVILY, 
				context
			);
			expect(isAvailable).toBe(true);
			expect(mockTavilyProvider.isAvailable).toHaveBeenCalledWith('test-key');
		});

		it('should check Perplexity availability with API key', async () => {
			const context = { apiKey: 'test-key' };
			const isAvailable = await researchRouter.checkProviderAvailability(
				RESEARCH_PROVIDERS.PERPLEXITY, 
				context
			);
			expect(isAvailable).toBe(true);
		});

		it('should return false for Perplexity without API key', async () => {
			const isAvailable = await researchRouter.checkProviderAvailability(
				RESEARCH_PROVIDERS.PERPLEXITY, 
				{}
			);
			expect(isAvailable).toBe(false);
		});
	});

	describe('Routing Statistics', () => {
		it('should provide routing statistics', () => {
			const stats = researchRouter.getRoutingStats();

			expect(stats.registeredProviders).toBeInstanceOf(Array);
			expect(stats.routingRules).toBeDefined();
			expect(stats.fallbackOrder).toBeInstanceOf(Array);
			expect(stats.fallbackOrder).toContain(RESEARCH_PROVIDERS.TAVILY);
			expect(stats.fallbackOrder).toContain(RESEARCH_PROVIDERS.CONTEXT7);
			expect(stats.fallbackOrder).toContain(RESEARCH_PROVIDERS.PERPLEXITY);
		});
	});

	describe('Routing Decision Explanation', () => {
		it('should explain routing decisions', () => {
			const explanation = researchRouter.explainRoutingDecision(
				RESEARCH_QUERY_TYPES.TECHNICAL, 
				RESEARCH_PROVIDERS.CONTEXT7
			);
			expect(explanation).toContain('Technical query');
			expect(explanation).toContain('context7');
		});
	});
});
