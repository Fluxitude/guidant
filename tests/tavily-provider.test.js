/**
 * tests/tavily-provider.test.js
 * Test suite for Tavily provider functionality
 */

import { TavilyProvider } from '../src/ai-providers/tavily.js';
import { jest } from '@jest/globals';

describe('TavilyProvider', () => {
	let tavilyProvider;
	const mockApiKey = 'test-tavily-api-key';

	beforeEach(() => {
		tavilyProvider = new TavilyProvider();
		// Mock fetch globally
		global.fetch = jest.fn();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('Constructor and Basic Properties', () => {
		it('should initialize with correct properties', () => {
			expect(tavilyProvider.name).toBe('Tavily');
			expect(tavilyProvider.type).toBe('api-based');
			expect(tavilyProvider.baseURL).toBe('https://api.tavily.com');
		});
	});

	describe('Authentication Validation', () => {
		it('should validate API key requirement', () => {
			expect(() => tavilyProvider.validateAuth({})).toThrow('Tavily API key is required');
			expect(() => tavilyProvider.validateAuth({ apiKey: mockApiKey })).not.toThrow();
		});

		it('should return mock client for compatibility', () => {
			const client = tavilyProvider.getClient({ apiKey: mockApiKey });
			expect(client).toEqual({
				type: 'api-based',
				provider: 'tavily',
				apiKey: mockApiKey,
				baseURL: 'https://api.tavily.com'
			});
		});
	});

	describe('Search Functionality', () => {
		it('should perform basic search with correct API call', async () => {
			const mockResponse = {
				query: 'test query',
				answer: 'Test answer',
				results: [
					{
						title: 'Test Result',
						url: 'https://example.com',
						content: 'Test content'
					}
				]
			};

			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await tavilyProvider.search('test query', {
				apiKey: mockApiKey,
				maxResults: 5
			});

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.tavily.com/search',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						api_key: mockApiKey,
						query: 'test query',
						search_depth: 'basic',
						max_results: 5,
						include_answer: true,
						include_images: false,
						include_raw_content: false
					})
				})
			);

			expect(result.provider).toBe('tavily');
			expect(result.query).toBe('test query');
			expect(result.answer).toBe('Test answer');
		});

		it('should handle API errors gracefully', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			});

			await expect(
				tavilyProvider.search('test query', { apiKey: 'invalid-key' })
			).rejects.toThrow('Tavily API error: 401 Unauthorized');
		});

		it('should require API key for search', async () => {
			await expect(
				tavilyProvider.search('test query', {})
			).rejects.toThrow('Tavily API key is required for search');
		});
	});

	describe('Market Research Functionality', () => {
		it('should research market opportunity with multiple queries', async () => {
			const projectContext = {
				projectType: 'web app',
				targetMarket: 'small business',
				competitors: ['competitor1', 'competitor2'],
				features: ['feature1', 'feature2']
			};

			const mockSearchResponse = {
				query: 'test',
				answer: 'Test answer',
				results: []
			};

			global.fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockSearchResponse)
			});

			const result = await tavilyProvider.researchMarketOpportunity(
				projectContext,
				{ apiKey: mockApiKey }
			);

			expect(result.projectContext).toEqual(projectContext);
			expect(result.queries).toBeInstanceOf(Array);
			expect(result.queries.length).toBeGreaterThan(0);
			expect(result.results).toBeInstanceOf(Array);
			expect(result.analysis).toBeDefined();
			expect(result.timestamp).toBeDefined();

			// Should have made multiple API calls for different queries
			expect(global.fetch).toHaveBeenCalledTimes(result.queries.length);
		});
	});

	describe('Competitive Research', () => {
		it('should research competitors with detailed queries', async () => {
			const competitors = ['competitor1', 'competitor2'];
			const projectType = 'web app';

			const mockSearchResponse = {
				query: 'test',
				answer: 'Test answer',
				results: []
			};

			global.fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockSearchResponse)
			});

			const result = await tavilyProvider.researchCompetitors(
				competitors,
				projectType,
				{ apiKey: mockApiKey }
			);

			expect(result.projectType).toBe(projectType);
			expect(result.competitors).toEqual(competitors);
			expect(result.analysis).toBeInstanceOf(Array);
			expect(result.analysis).toHaveLength(competitors.length);
			expect(result.insights).toBeDefined();
		});
	});

	describe('Industry Trends Research', () => {
		it('should research industry trends with comprehensive queries', async () => {
			const industry = 'fintech';

			const mockSearchResponse = {
				query: 'test',
				answer: 'Test answer',
				results: []
			};

			global.fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockSearchResponse)
			});

			const result = await tavilyProvider.researchIndustryTrends(
				industry,
				{ apiKey: mockApiKey, timeframe: '2024' }
			);

			expect(result.industry).toBe(industry);
			expect(result.timeframe).toBe('2024');
			expect(result.queries).toBeInstanceOf(Array);
			expect(result.results).toBeInstanceOf(Array);
			expect(result.trends).toBeDefined();
			expect(result.opportunities).toBeDefined();
		});
	});

	describe('Availability Check', () => {
		it('should check availability with test query', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					query: 'test',
					answer: 'Test response',
					results: []
				})
			});

			const isAvailable = await tavilyProvider.isAvailable(mockApiKey);
			expect(isAvailable).toBe(true);
		});

		it('should return false when API key is missing', async () => {
			const isAvailable = await tavilyProvider.isAvailable();
			expect(isAvailable).toBe(false);
		});

		it('should return false when API call fails', async () => {
			global.fetch.mockRejectedValueOnce(new Error('Network error'));

			const isAvailable = await tavilyProvider.isAvailable(mockApiKey);
			expect(isAvailable).toBe(false);
		});
	});

	describe('Supported Categories', () => {
		it('should return list of supported search categories', () => {
			const categories = tavilyProvider.getSupportedCategories();
			expect(categories).toBeInstanceOf(Array);
			expect(categories).toContain('market-research');
			expect(categories).toContain('competitive-analysis');
			expect(categories).toContain('industry-trends');
		});
	});

	describe('Discovery System Integration', () => {
		it('should format results for discovery system', () => {
			const rawResults = {
				analysis: { marketSize: 'large' },
				results: [{ title: 'Test', url: 'https://example.com' }]
			};

			const formatted = tavilyProvider.formatForDiscovery(rawResults);

			expect(formatted.provider).toBe('tavily');
			expect(formatted.timestamp).toBeDefined();
			expect(formatted.marketResearch).toBeDefined();
			expect(formatted.marketResearch.available).toBe(true);
			expect(formatted.marketResearch.confidence).toBe('high');
		});
	});
});
