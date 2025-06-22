/**
 * mcp-server/src/core/discovery/research-router.js
 * Intelligent routing logic for research providers in the discovery system
 * Routes queries to optimal provider (Context7, Tavily, Perplexity) based on query type and context
 */

import { 
	RESEARCH_PROVIDERS, 
	RESEARCH_QUERY_TYPES, 
	RESEARCH_ROUTING_PATTERNS,
	DISCOVERY_STAGES 
} from './constants.js';
import { log } from '../../../../scripts/modules/index.js';

export class ResearchRouter {
	constructor() {
		this.providers = new Map();
		this.routingRules = this.initializeRoutingRules();
		this.fallbackOrder = [
			RESEARCH_PROVIDERS.TAVILY,    // Primary for market research
			RESEARCH_PROVIDERS.CONTEXT7,  // Primary for technical queries
			RESEARCH_PROVIDERS.PERPLEXITY // Fallback for general queries
		];
	}

	/**
	 * Register a research provider with the router
	 * @param {string} providerName - Name of the provider
	 * @param {Object} providerInstance - Provider instance
	 */
	registerProvider(providerName, providerInstance) {
		if (!Object.values(RESEARCH_PROVIDERS).includes(providerName)) {
			throw new Error(`Unknown provider: ${providerName}`);
		}

		this.providers.set(providerName, providerInstance);
		log('debug', `ResearchRouter: Registered provider ${providerName}`);
	}

	/**
	 * Route a research query to the optimal provider
	 * @param {string} query - Research query
	 * @param {Object} context - Query context
	 * @returns {Promise<Object>} Research results with provider metadata
	 */
	async routeQuery(query, context = {}) {
		try {
			const queryType = this.classifyQuery(query, context);
			const optimalProvider = this.selectProvider(queryType, context);
			
			log('debug', `ResearchRouter: Routing query "${query}" to ${optimalProvider} (type: ${queryType})`);

			const provider = this.providers.get(optimalProvider);
			if (!provider) {
				throw new Error(`Provider ${optimalProvider} not registered`);
			}

			// Check provider availability
			const isAvailable = await this.checkProviderAvailability(optimalProvider, context);
			if (!isAvailable) {
				log('warn', `ResearchRouter: Provider ${optimalProvider} unavailable, trying fallback`);
				return await this.routeWithFallback(query, context, [optimalProvider]);
			}

			// Execute query with the selected provider
			const results = await this.executeQuery(provider, optimalProvider, query, context);
			
			return {
				provider: optimalProvider,
				queryType,
				query,
				results,
				metadata: {
					routingDecision: this.explainRoutingDecision(queryType, optimalProvider),
					timestamp: new Date().toISOString(),
					context
				}
			};
		} catch (error) {
			log('error', `ResearchRouter: Query routing failed - ${error.message}`);
			throw new Error(`Research routing failed: ${error.message}`);
		}
	}

	/**
	 * Route multiple queries in batch with intelligent load balancing
	 * @param {Array<Object>} queries - Array of query objects with {query, context}
	 * @returns {Promise<Array<Object>>} Array of research results
	 */
	async routeBatch(queries) {
		try {
			log('debug', `ResearchRouter: Routing batch of ${queries.length} queries`);

			// Classify all queries first
			const classifiedQueries = queries.map(({ query, context = {} }) => ({
				query,
				context,
				queryType: this.classifyQuery(query, context),
				optimalProvider: this.selectProvider(this.classifyQuery(query, context), context)
			}));

			// Group by provider for efficient batch processing
			const providerGroups = this.groupQueriesByProvider(classifiedQueries);

			// Execute queries by provider group
			const results = [];
			for (const [providerName, providerQueries] of providerGroups) {
				const provider = this.providers.get(providerName);
				if (!provider) {
					log('warn', `ResearchRouter: Provider ${providerName} not registered, skipping queries`);
					continue;
				}

				const providerResults = await Promise.all(
					providerQueries.map(async (queryObj) => {
						try {
							const result = await this.executeQuery(
								provider, 
								providerName, 
								queryObj.query, 
								queryObj.context
							);
							return {
								provider: providerName,
								queryType: queryObj.queryType,
								query: queryObj.query,
								results: result,
								metadata: {
									routingDecision: this.explainRoutingDecision(queryObj.queryType, providerName),
									timestamp: new Date().toISOString(),
									context: queryObj.context
								}
							};
						} catch (error) {
							log('error', `ResearchRouter: Batch query failed for ${queryObj.query} - ${error.message}`);
							return {
								provider: providerName,
								query: queryObj.query,
								error: error.message,
								timestamp: new Date().toISOString()
							};
						}
					})
				);

				results.push(...providerResults);
			}

			log('debug', `ResearchRouter: Batch routing completed, ${results.length} results`);
			return results;
		} catch (error) {
			log('error', `ResearchRouter: Batch routing failed - ${error.message}`);
			throw new Error(`Batch research routing failed: ${error.message}`);
		}
	}

	/**
	 * Classify query type based on content and context
	 * @param {string} query - Research query
	 * @param {Object} context - Query context
	 * @returns {string} Query type classification
	 */
	classifyQuery(query, context = {}) {
		const queryLower = query.toLowerCase();
		const { stage, projectType, focus } = context;

		// Stage-based classification
		if (stage === DISCOVERY_STAGES.TECHNICAL_FEASIBILITY) {
			return RESEARCH_QUERY_TYPES.TECHNICAL;
		}
		if (stage === DISCOVERY_STAGES.MARKET_RESEARCH) {
			return RESEARCH_QUERY_TYPES.MARKET;
		}

		// Context-based classification
		if (focus === 'competitive' || focus === 'competitors') {
			return RESEARCH_QUERY_TYPES.COMPETITIVE;
		}

		// Keyword-based classification
		const technicalKeywords = RESEARCH_ROUTING_PATTERNS.TECHNICAL_KEYWORDS;
		const marketKeywords = RESEARCH_ROUTING_PATTERNS.MARKET_KEYWORDS;

		const technicalMatches = technicalKeywords.filter(keyword => 
			queryLower.includes(keyword.toLowerCase())
		).length;

		const marketMatches = marketKeywords.filter(keyword => 
			queryLower.includes(keyword.toLowerCase())
		).length;

		// Determine classification based on keyword matches
		if (technicalMatches > marketMatches && technicalMatches > 0) {
			return RESEARCH_QUERY_TYPES.TECHNICAL;
		}
		if (marketMatches > technicalMatches && marketMatches > 0) {
			return RESEARCH_QUERY_TYPES.MARKET;
		}
		if (technicalMatches > 0 && marketMatches > 0) {
			return RESEARCH_QUERY_TYPES.HYBRID;
		}

		// Default classification
		return RESEARCH_QUERY_TYPES.GENERAL;
	}

	/**
	 * Select optimal provider based on query type and context
	 * @param {string} queryType - Classified query type
	 * @param {Object} context - Query context
	 * @returns {string} Selected provider name
	 */
	selectProvider(queryType, context = {}) {
		const rules = this.routingRules.get(queryType);
		if (!rules) {
			return this.fallbackOrder[0]; // Default to Tavily
		}

		// Apply context-specific rules
		for (const rule of rules) {
			if (this.evaluateRule(rule, context)) {
				return rule.provider;
			}
		}

		// Return default provider for query type
		return rules[0]?.provider || this.fallbackOrder[0];
	}

	/**
	 * Execute query with specific provider
	 * @param {Object} provider - Provider instance
	 * @param {string} providerName - Provider name
	 * @param {string} query - Research query
	 * @param {Object} context - Query context
	 * @returns {Promise<Object>} Query results
	 */
	async executeQuery(provider, providerName, query, context) {
		switch (providerName) {
			case RESEARCH_PROVIDERS.CONTEXT7:
				return await this.executeContext7Query(provider, query, context);
			
			case RESEARCH_PROVIDERS.TAVILY:
				return await this.executeTavilyQuery(provider, query, context);
			
			case RESEARCH_PROVIDERS.PERPLEXITY:
				return await this.executePerplexityQuery(provider, query, context);
			
			default:
				throw new Error(`Unknown provider execution method: ${providerName}`);
		}
	}

	/**
	 * Execute Context7 query
	 * @param {Object} provider - Context7 provider instance
	 * @param {string} query - Research query
	 * @param {Object} context - Query context
	 * @returns {Promise<Object>} Context7 results
	 */
	async executeContext7Query(provider, query, context) {
		const { projectType, technologies = [] } = context;

		if (technologies.length > 0) {
			// Technical feasibility validation
			return await provider.validateTechnicalFeasibility(technologies, query);
		} else if (projectType) {
			// Architecture recommendations
			return await provider.getArchitectureRecommendations({
				projectType,
				features: context.features || [],
				scale: context.scale || 'medium'
			});
		} else {
			// Library resolution and documentation
			return await provider.resolveLibraryId(query);
		}
	}

	/**
	 * Execute Tavily query
	 * @param {Object} provider - Tavily provider instance
	 * @param {string} query - Research query
	 * @param {Object} context - Query context
	 * @returns {Promise<Object>} Tavily results
	 */
	async executeTavilyQuery(provider, query, context) {
		const { apiKey, stage, projectType } = context;

		if (stage === DISCOVERY_STAGES.MARKET_RESEARCH) {
			// Market opportunity research
			return await provider.researchMarketOpportunity({
				projectType,
				targetMarket: context.targetMarket,
				competitors: context.competitors,
				features: context.features
			}, { apiKey });
		} else {
			// General search
			return await provider.search(query, {
				apiKey,
				searchDepth: 'advanced',
				maxResults: 10,
				includeAnswer: true
			});
		}
	}

	/**
	 * Execute Perplexity query
	 * @param {Object} provider - Perplexity provider instance
	 * @param {string} query - Research query
	 * @param {Object} context - Query context
	 * @returns {Promise<Object>} Perplexity results
	 */
	async executePerplexityQuery(provider, query, context) {
		// Perplexity uses standard AI provider interface
		const { apiKey, modelId = 'llama-3.1-sonar-small-128k-online' } = context;
		
		return await provider.generateText({
			apiKey,
			modelId,
			messages: [
				{
					role: 'user',
					content: `Research and provide comprehensive information about: ${query}`
				}
			],
			maxTokens: 2000,
			temperature: 0.1
		});
	}

	/**
	 * Route query with fallback providers
	 * @param {string} query - Research query
	 * @param {Object} context - Query context
	 * @param {Array<string>} excludeProviders - Providers to exclude
	 * @returns {Promise<Object>} Research results
	 */
	async routeWithFallback(query, context, excludeProviders = []) {
		const availableProviders = this.fallbackOrder.filter(
			provider => !excludeProviders.includes(provider)
		);

		for (const providerName of availableProviders) {
			try {
				const provider = this.providers.get(providerName);
				if (!provider) continue;

				const isAvailable = await this.checkProviderAvailability(providerName, context);
				if (!isAvailable) continue;

				log('debug', `ResearchRouter: Trying fallback provider ${providerName}`);
				
				const results = await this.executeQuery(provider, providerName, query, context);
				
				return {
					provider: providerName,
					queryType: this.classifyQuery(query, context),
					query,
					results,
					metadata: {
						routingDecision: `Fallback to ${providerName}`,
						timestamp: new Date().toISOString(),
						context
					}
				};
			} catch (error) {
				log('warn', `ResearchRouter: Fallback provider ${providerName} failed - ${error.message}`);
				continue;
			}
		}

		throw new Error('All research providers failed or unavailable');
	}

	/**
	 * Check if provider is available and accessible
	 * @param {string} providerName - Provider name
	 * @param {Object} context - Query context with credentials
	 * @returns {Promise<boolean>} Provider availability
	 */
	async checkProviderAvailability(providerName, context) {
		try {
			const provider = this.providers.get(providerName);
			if (!provider) return false;

			// Provider-specific availability checks
			switch (providerName) {
				case RESEARCH_PROVIDERS.CONTEXT7:
					return await provider.isAvailable();
				
				case RESEARCH_PROVIDERS.TAVILY:
					return await provider.isAvailable(context.apiKey);
				
				case RESEARCH_PROVIDERS.PERPLEXITY:
					return context.apiKey ? true : false;
				
				default:
					return false;
			}
		} catch (error) {
			log('debug', `ResearchRouter: Provider ${providerName} availability check failed`);
			return false;
		}
	}

	/**
	 * Initialize routing rules for different query types
	 * @returns {Map} Routing rules map
	 */
	initializeRoutingRules() {
		const rules = new Map();

		// Technical query routing
		rules.set(RESEARCH_QUERY_TYPES.TECHNICAL, [
			{ provider: RESEARCH_PROVIDERS.CONTEXT7, priority: 1, condition: 'always' },
			{ provider: RESEARCH_PROVIDERS.PERPLEXITY, priority: 2, condition: 'fallback' }
		]);

		// Market query routing
		rules.set(RESEARCH_QUERY_TYPES.MARKET, [
			{ provider: RESEARCH_PROVIDERS.TAVILY, priority: 1, condition: 'always' },
			{ provider: RESEARCH_PROVIDERS.PERPLEXITY, priority: 2, condition: 'fallback' }
		]);

		// Competitive query routing
		rules.set(RESEARCH_QUERY_TYPES.COMPETITIVE, [
			{ provider: RESEARCH_PROVIDERS.TAVILY, priority: 1, condition: 'always' },
			{ provider: RESEARCH_PROVIDERS.PERPLEXITY, priority: 2, condition: 'fallback' }
		]);

		// Hybrid query routing
		rules.set(RESEARCH_QUERY_TYPES.HYBRID, [
			{ provider: RESEARCH_PROVIDERS.TAVILY, priority: 1, condition: 'market_focus' },
			{ provider: RESEARCH_PROVIDERS.CONTEXT7, priority: 1, condition: 'technical_focus' },
			{ provider: RESEARCH_PROVIDERS.PERPLEXITY, priority: 2, condition: 'fallback' }
		]);

		// General query routing
		rules.set(RESEARCH_QUERY_TYPES.GENERAL, [
			{ provider: RESEARCH_PROVIDERS.PERPLEXITY, priority: 1, condition: 'always' },
			{ provider: RESEARCH_PROVIDERS.TAVILY, priority: 2, condition: 'fallback' }
		]);

		return rules;
	}

	/**
	 * Evaluate routing rule condition
	 * @param {Object} rule - Routing rule
	 * @param {Object} context - Query context
	 * @returns {boolean} Whether rule condition is met
	 */
	evaluateRule(rule, context) {
		switch (rule.condition) {
			case 'always':
				return true;
			case 'market_focus':
				return context.focus === 'market' || context.stage === DISCOVERY_STAGES.MARKET_RESEARCH;
			case 'technical_focus':
				return context.focus === 'technical' || context.stage === DISCOVERY_STAGES.TECHNICAL_FEASIBILITY;
			case 'fallback':
				return false; // Only used in fallback scenarios
			default:
				return false;
		}
	}

	/**
	 * Group queries by optimal provider for batch processing
	 * @param {Array<Object>} classifiedQueries - Classified query objects
	 * @returns {Map} Provider groups map
	 */
	groupQueriesByProvider(classifiedQueries) {
		const groups = new Map();

		for (const queryObj of classifiedQueries) {
			const provider = queryObj.optimalProvider;
			if (!groups.has(provider)) {
				groups.set(provider, []);
			}
			groups.get(provider).push(queryObj);
		}

		return groups;
	}

	/**
	 * Explain routing decision for transparency
	 * @param {string} queryType - Query type
	 * @param {string} selectedProvider - Selected provider
	 * @returns {string} Routing decision explanation
	 */
	explainRoutingDecision(queryType, selectedProvider) {
		const explanations = {
			[RESEARCH_QUERY_TYPES.TECHNICAL]: `Technical query routed to ${selectedProvider} for library documentation and feasibility analysis`,
			[RESEARCH_QUERY_TYPES.MARKET]: `Market query routed to ${selectedProvider} for competitive analysis and market research`,
			[RESEARCH_QUERY_TYPES.COMPETITIVE]: `Competitive query routed to ${selectedProvider} for competitor analysis`,
			[RESEARCH_QUERY_TYPES.HYBRID]: `Hybrid query routed to ${selectedProvider} based on context priority`,
			[RESEARCH_QUERY_TYPES.GENERAL]: `General query routed to ${selectedProvider} for comprehensive research`
		};

		return explanations[queryType] || `Query routed to ${selectedProvider}`;
	}

	/**
	 * Get routing statistics and performance metrics
	 * @returns {Object} Routing statistics
	 */
	getRoutingStats() {
		return {
			registeredProviders: Array.from(this.providers.keys()),
			routingRules: Object.fromEntries(this.routingRules),
			fallbackOrder: this.fallbackOrder
		};
	}
}
