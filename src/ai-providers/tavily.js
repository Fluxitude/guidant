/**
 * src/ai-providers/tavily.js
 * Tavily provider for AI-optimized search and research via REST API
 * Cost-effective alternative to Perplexity for market research and competitive analysis
 */

import { BaseAIProvider } from './base-provider.js';
import { log } from '../../scripts/modules/utils.js';

export class TavilyProvider extends BaseAIProvider {
	constructor() {
		super();
		this.name = 'Tavily';
		this.type = 'api-based'; // REST API based provider
		this.baseURL = 'https://api.tavily.com';
	}

	/**
	 * Tavily requires API key for authentication
	 * Override the default validation to check for Tavily-specific requirements
	 */
	validateAuth(params) {
		if (!params.apiKey) {
			throw new Error('Tavily API key is required');
		}
		// Additional validation could be added here
		return true;
	}

	/**
	 * Tavily uses REST API calls, not traditional AI SDK client pattern
	 * Return a mock client for compatibility with BaseAIProvider
	 */
	getClient(params) {
		this.validateAuth(params);
		return {
			type: 'api-based',
			provider: 'tavily',
			apiKey: params.apiKey,
			baseURL: this.baseURL
		};
	}

	/**
	 * Perform AI-optimized search using Tavily API
	 * @param {string} query - Search query
	 * @param {Object} options - Search options
	 * @returns {Promise<Object>} Search results
	 */
	async search(query, options = {}) {
		try {
			const {
				apiKey,
				searchDepth = 'basic',
				maxResults = 10,
				includeDomains = [],
				excludeDomains = [],
				includeAnswer = true,
				includeImages = false,
				includeRawContent = false
			} = options;

			if (!apiKey) {
				throw new Error('Tavily API key is required for search');
			}

			log('debug', `Tavily: Performing search for query: ${query}`);

			const requestBody = {
				api_key: apiKey,
				query: query,
				search_depth: searchDepth,
				max_results: maxResults,
				include_answer: includeAnswer,
				include_images: includeImages,
				include_raw_content: includeRawContent,
				...(includeDomains.length > 0 && { include_domains: includeDomains }),
				...(excludeDomains.length > 0 && { exclude_domains: excludeDomains })
			};

			const response = await fetch(`${this.baseURL}/search`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			
			log('debug', `Tavily: Search completed successfully for query: ${query}`);
			return this.formatSearchResults(data);
		} catch (error) {
			this.handleError('search', error);
		}
	}

	/**
	 * Research market opportunity using Tavily search
	 * @param {Object} projectContext - Project context for market research
	 * @returns {Promise<Object>} Market research results
	 */
	async researchMarketOpportunity(projectContext, options = {}) {
		try {
			const { projectType, targetMarket, competitors, features } = projectContext;
			const { apiKey } = options;

			log('debug', `Tavily: Researching market opportunity for ${projectType} project`);

			const marketQueries = [
				`${projectType} market size trends 2024`,
				`${targetMarket} ${projectType} competition analysis`,
				`${projectType} user needs pain points`,
				`${projectType} market opportunities gaps`
			];

			// Add competitor-specific queries
			if (competitors && competitors.length > 0) {
				competitors.forEach(competitor => {
					marketQueries.push(`${competitor} ${projectType} features pricing`);
				});
			}

			// Add feature-specific market queries
			if (features && features.length > 0) {
				features.forEach(feature => {
					marketQueries.push(`${feature} ${projectType} market demand`);
				});
			}

			const searchPromises = marketQueries.map(query => 
				this.search(query, {
					apiKey,
					searchDepth: 'advanced',
					maxResults: 5,
					includeAnswer: true,
					includeRawContent: true
				})
			);

			const results = await Promise.all(searchPromises);

			const marketResearch = {
				projectContext,
				queries: marketQueries,
				results: results,
				analysis: this.synthesizeMarketAnalysis(results, projectContext),
				timestamp: new Date().toISOString()
			};

			log('debug', `Tavily: Market opportunity research completed for ${projectType}`);
			return marketResearch;
		} catch (error) {
			this.handleError('market opportunity research', error);
		}
	}

	/**
	 * Research competitive landscape
	 * @param {Array<string>} competitors - List of competitors to research
	 * @param {string} projectType - Type of project for context
	 * @param {Object} options - Search options
	 * @returns {Promise<Object>} Competitive analysis results
	 */
	async researchCompetitors(competitors, projectType, options = {}) {
		try {
			const { apiKey } = options;
			
			log('debug', `Tavily: Researching ${competitors.length} competitors for ${projectType}`);

			const competitorAnalysis = [];

			for (const competitor of competitors) {
				const competitorQueries = [
					`${competitor} features pricing business model`,
					`${competitor} user reviews complaints`,
					`${competitor} market position strengths weaknesses`,
					`${competitor} recent updates product roadmap`
				];

				const competitorResults = await Promise.all(
					competitorQueries.map(query => 
						this.search(query, {
							apiKey,
							searchDepth: 'advanced',
							maxResults: 3,
							includeAnswer: true
						})
					)
				);

				competitorAnalysis.push({
					competitor,
					queries: competitorQueries,
					results: competitorResults,
					summary: this.summarizeCompetitorData(competitorResults, competitor)
				});
			}

			const result = {
				projectType,
				competitors,
				analysis: competitorAnalysis,
				insights: this.generateCompetitiveInsights(competitorAnalysis),
				timestamp: new Date().toISOString()
			};

			log('debug', `Tavily: Competitive research completed for ${competitors.length} competitors`);
			return result;
		} catch (error) {
			this.handleError('competitive research', error);
		}
	}

	/**
	 * Research industry trends and opportunities
	 * @param {string} industry - Industry to research
	 * @param {Object} options - Search options
	 * @returns {Promise<Object>} Industry trends analysis
	 */
	async researchIndustryTrends(industry, options = {}) {
		try {
			const { apiKey, timeframe = '2024' } = options;
			
			log('debug', `Tavily: Researching industry trends for ${industry}`);

			const trendQueries = [
				`${industry} trends ${timeframe}`,
				`${industry} market growth opportunities ${timeframe}`,
				`${industry} emerging technologies innovations`,
				`${industry} consumer behavior changes ${timeframe}`,
				`${industry} regulatory changes impact ${timeframe}`
			];

			const trendResults = await Promise.all(
				trendQueries.map(query => 
					this.search(query, {
						apiKey,
						searchDepth: 'advanced',
						maxResults: 8,
						includeAnswer: true,
						includeRawContent: true
					})
				)
			);

			const result = {
				industry,
				timeframe,
				queries: trendQueries,
				results: trendResults,
				trends: this.extractTrends(trendResults),
				opportunities: this.identifyOpportunities(trendResults, industry),
				timestamp: new Date().toISOString()
			};

			log('debug', `Tavily: Industry trends research completed for ${industry}`);
			return result;
		} catch (error) {
			this.handleError('industry trends research', error);
		}
	}

	/**
	 * Format raw Tavily search results for consistency
	 * @param {Object} rawResults - Raw results from Tavily API
	 * @returns {Object} Formatted search results
	 */
	formatSearchResults(rawResults) {
		return {
			provider: 'tavily',
			query: rawResults.query || '',
			answer: rawResults.answer || '',
			results: rawResults.results || [],
			images: rawResults.images || [],
			followUpQuestions: rawResults.follow_up_questions || [],
			searchDepth: rawResults.search_depth || 'basic',
			timestamp: new Date().toISOString()
		};
	}

	/**
	 * Synthesize market analysis from search results
	 * @param {Array} results - Array of search results
	 * @param {Object} projectContext - Project context
	 * @returns {Object} Market analysis synthesis
	 */
	synthesizeMarketAnalysis(results, projectContext) {
		// This would contain logic to analyze and synthesize market data
		// For now, return a structured placeholder
		return {
			marketSize: 'Analysis pending - requires AI processing of search results',
			competitiveLandscape: 'Analysis pending - requires AI processing of search results',
			opportunities: 'Analysis pending - requires AI processing of search results',
			threats: 'Analysis pending - requires AI processing of search results',
			recommendations: 'Analysis pending - requires AI processing of search results'
		};
	}

	/**
	 * Summarize competitor data from search results
	 * @param {Array} results - Competitor search results
	 * @param {string} competitor - Competitor name
	 * @returns {Object} Competitor summary
	 */
	summarizeCompetitorData(results, competitor) {
		return {
			competitor,
			strengths: 'Analysis pending - requires AI processing',
			weaknesses: 'Analysis pending - requires AI processing',
			pricing: 'Analysis pending - requires AI processing',
			features: 'Analysis pending - requires AI processing',
			marketPosition: 'Analysis pending - requires AI processing'
		};
	}

	/**
	 * Generate competitive insights from analysis
	 * @param {Array} competitorAnalysis - Array of competitor analyses
	 * @returns {Object} Competitive insights
	 */
	generateCompetitiveInsights(competitorAnalysis) {
		return {
			marketGaps: 'Analysis pending - requires AI processing',
			differentiationOpportunities: 'Analysis pending - requires AI processing',
			pricingStrategy: 'Analysis pending - requires AI processing',
			featurePriorities: 'Analysis pending - requires AI processing'
		};
	}

	/**
	 * Extract trends from search results
	 * @param {Array} results - Trend search results
	 * @returns {Array} Extracted trends
	 */
	extractTrends(results) {
		// Placeholder for trend extraction logic
		return ['Trend analysis pending - requires AI processing of search results'];
	}

	/**
	 * Identify opportunities from trend data
	 * @param {Array} results - Trend search results
	 * @param {string} industry - Industry context
	 * @returns {Array} Identified opportunities
	 */
	identifyOpportunities(results, industry) {
		// Placeholder for opportunity identification logic
		return ['Opportunity analysis pending - requires AI processing of search results'];
	}

	/**
	 * Check if Tavily API is available and accessible
	 * @param {string} apiKey - Tavily API key
	 * @returns {Promise<boolean>} Whether Tavily is available
	 */
	async isAvailable(apiKey) {
		try {
			if (!apiKey) {
				log('debug', 'Tavily: No API key provided for availability check');
				return false;
			}

			// Test with a simple search query
			const testResult = await this.search('test', {
				apiKey,
				maxResults: 1,
				searchDepth: 'basic'
			});

			log('debug', 'Tavily: API availability confirmed');
			return true;
		} catch (error) {
			log('error', `Tavily: API availability check failed - ${error.message}`);
			return false;
		}
	}

	/**
	 * Get supported search categories
	 * @returns {Array<string>} List of supported search categories
	 */
	getSupportedCategories() {
		return [
			'market-research',
			'competitive-analysis',
			'industry-trends',
			'consumer-insights',
			'technology-trends',
			'business-intelligence',
			'product-research',
			'pricing-analysis'
		];
	}

	/**
	 * Format Tavily results for discovery system
	 * @param {Object} rawResults - Raw results from Tavily
	 * @returns {Object} Formatted results for discovery
	 */
	formatForDiscovery(rawResults) {
		try {
			return {
				provider: 'tavily',
				timestamp: new Date().toISOString(),
				marketResearch: {
					available: true,
					confidence: 'high',
					insights: rawResults.analysis || {},
					sources: rawResults.results || [],
					recommendations: []
				}
			};
		} catch (error) {
			this.handleError('result formatting for discovery', error);
		}
	}
}
