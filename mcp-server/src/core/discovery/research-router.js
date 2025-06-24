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
import fs from 'fs';
import path from 'path';
import { buildProviderAdapter } from './provider-adapters.js';

/**
 * Load research router configuration from config/research-router-config.json.
 * If the file is missing or invalid, returns null so the router can fall back
 * to its built-in defaults.
 */
function loadResearchRouterConfig() {
	const candidatePaths = [
		// Common location inside mono-repo root
		path.resolve(process.cwd(), 'config', 'research-router-config.json'),
		// Fallback to historical path inside claude-task-master subfolder
		path.resolve(process.cwd(), 'claude-task-master', 'config', 'research-router-config.json')
	];

	for (const configPath of candidatePaths) {
		try {
			if (!fs.existsSync(configPath)) continue;
			const raw = fs.readFileSync(configPath, 'utf8');
			return JSON.parse(raw);
		} catch (err) {
			// eslint-disable-next-line no-console
			console.warn(`ResearchRouter: Failed to load config from ${configPath}:`, err.message);
		}
	}
	return null; // No valid config found
}

// Store the resolved config path globally within this module so we can watch it
let researchRouterConfigPath = null;

function resolveResearchRouterConfigPath() {
	const candidatePaths = [
		path.resolve(process.cwd(), 'config', 'research-router-config.json'),
		path.resolve(process.cwd(), 'claude-task-master', 'config', 'research-router-config.json')
	];
	for (const p of candidatePaths) {
		if (fs.existsSync(p)) return p;
	}
	return null;
}

function watchResearchRouterConfig(onChange) {
	researchRouterConfigPath = resolveResearchRouterConfigPath();
	if (!researchRouterConfigPath) return;
	fs.watchFile(researchRouterConfigPath, { interval: 2000 }, () => {
		try {
			const updated = loadResearchRouterConfig();
			if (updated) {
				onChange(updated);
				log('info', 'ResearchRouter: External config reloaded');
			}
		} catch (err) {
			log('warn', 'ResearchRouter: Failed to reload config:', err.message);
		}
	});
}

export class ResearchRouter {
	constructor() {
		this.providers = new Map();

		// Attempt to load external configuration
		const externalConfig = loadResearchRouterConfig();

		// Routing rules
		if (externalConfig && externalConfig.routingRules) {
			this.routingRules = this.initializeRoutingRulesFromConfig(externalConfig.routingRules);
		} else {
			this.routingRules = this.initializeRoutingRules();
		}

		// Fallback order
		if (externalConfig && Array.isArray(externalConfig.fallbackOrder)) {
			this.fallbackOrder = externalConfig.fallbackOrder;
		} else {
			this.fallbackOrder = [
				RESEARCH_PROVIDERS.TAVILY,    // Primary for market research
				RESEARCH_PROVIDERS.CONTEXT7,  // Primary for technical queries
				RESEARCH_PROVIDERS.PERPLEXITY // Fallback for general queries
			];
		}

		// Keyword lists for classification (optional use later)
		this.keywordLists = externalConfig?.classificationKeywords || null;

		// Start watching config file for changes
		watchResearchRouterConfig((newConfig) => {
			if (newConfig.routingRules) {
				this.routingRules = this.initializeRoutingRulesFromConfig(newConfig.routingRules);
			}
			if (Array.isArray(newConfig.fallbackOrder)) {
				this.fallbackOrder = newConfig.fallbackOrder;
			}
			if (newConfig.classificationKeywords) {
				this.keywordLists = newConfig.classificationKeywords;
			}
		});
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

		// Wrap in adapter so we expose uniform interface
		const adapter = buildProviderAdapter(providerName, providerInstance);
		this.providers.set(providerName, adapter);
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

			const isAvailable = await provider.isAvailable?.(context);
			if (!isAvailable) {
				log('warn', `ResearchRouter: Provider ${optimalProvider} unavailable, trying fallback`);
				return await this.routeWithFallback(query, context, [optimalProvider]);
			}

			const results = await provider.execute(this.classifyQuery(query, context), query, context);
			
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
					providerQueries.map(async (qObj) => {
						try {
							const res = await provider.execute(qObj.queryType, qObj.query, qObj.context);
							return {
								provider: providerName,
								queryType: qObj.queryType,
								query: qObj.query,
								results: res,
								metadata: {
									routingDecision: this.explainRoutingDecision(qObj.queryType, providerName),
									timestamp: new Date().toISOString(),
									context: qObj.context
								}
							};
						} catch (error) {
							log('error', `ResearchRouter: Batch query failed for ${qObj.query} - ${error.message}`);
							return {
								provider: providerName,
								query: qObj.query,
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
		const technicalKeywords = this.keywordLists?.technical || RESEARCH_ROUTING_PATTERNS.TECHNICAL_KEYWORDS;
		const marketKeywords = this.keywordLists?.market || RESEARCH_ROUTING_PATTERNS.MARKET_KEYWORDS;

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
		const rules = this.routingRules.get(queryType.toLowerCase());
		if (!rules) {
			return this.fallbackOrder[0]; // Default provider
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

				const isAvailable = await provider.isAvailable?.(context);
				if (!isAvailable) continue;

				log('debug', `ResearchRouter: Trying fallback provider ${providerName}`);
				
				const results = await provider.execute(this.classifyQuery(query, context), query, context);
				
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
				log('warn', `ResearchRouter: Fallback failed for ${query} - ${error.message}`);
			}
		}
		throw new Error(`All fallback providers failed for ${query}`);
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
					return !!context.apiKey;
				default:
					return false;
			}
		} catch (error) {
			log('debug', `ResearchRouter: Provider ${providerName} availability check failed`);
			return false;
		}
	}

	/**
	 * Initialize default routing rules (used when no external config).
	 */
	initializeRoutingRules() {
		const rules = new Map();
		rules.set(RESEARCH_QUERY_TYPES.TECHNICAL, [
			{ provider: RESEARCH_PROVIDERS.CONTEXT7, priority: 1, condition: 'always' },
			{ provider: RESEARCH_PROVIDERS.PERPLEXITY, priority: 2, condition: 'fallback' }
		]);
		rules.set(RESEARCH_QUERY_TYPES.MARKET, [
			{ provider: RESEARCH_PROVIDERS.TAVILY, priority: 1, condition: 'always' },
			{ provider: RESEARCH_PROVIDERS.PERPLEXITY, priority: 2, condition: 'fallback' }
		]);
		rules.set(RESEARCH_QUERY_TYPES.COMPETITIVE, [
			{ provider: RESEARCH_PROVIDERS.TAVILY, priority: 1, condition: 'always' },
			{ provider: RESEARCH_PROVIDERS.PERPLEXITY, priority: 2, condition: 'fallback' }
		]);
		rules.set(RESEARCH_QUERY_TYPES.HYBRID, [
			{ provider: RESEARCH_PROVIDERS.TAVILY, priority: 1, condition: 'market_focus' },
			{ provider: RESEARCH_PROVIDERS.CONTEXT7, priority: 1, condition: 'technical_focus' },
			{ provider: RESEARCH_PROVIDERS.PERPLEXITY, priority: 2, condition: 'fallback' }
		]);
		rules.set(RESEARCH_QUERY_TYPES.GENERAL, [
			{ provider: RESEARCH_PROVIDERS.PERPLEXITY, priority: 1, condition: 'always' },
			{ provider: RESEARCH_PROVIDERS.TAVILY, priority: 2, condition: 'fallback' }
		]);
		return rules;
	}

	/**
	 * Evaluate routing rule condition.
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
				return false;
			default:
				return false;
		}
	}

	/**
	 * Group queries by optimal provider for batch processing
	 */
	groupQueriesByProvider(classifiedQueries) {
		const groups = new Map();
		for (const q of classifiedQueries) {
			if (!groups.has(q.optimalProvider)) {
				groups.set(q.optimalProvider, []);
			}
			groups.get(q.optimalProvider).push(q);
		}
		return groups;
	}

	/**
	 * Human-friendly explanation of routing decision.
	 */
	explainRoutingDecision(queryType, selectedProvider) {
		const explanations = {
			[RESEARCH_QUERY_TYPES.TECHNICAL]: `Technical query routed to ${selectedProvider} for documentation and feasibility analysis`,
			[RESEARCH_QUERY_TYPES.MARKET]: `Market query routed to ${selectedProvider} for competitive or market research`,
			[RESEARCH_QUERY_TYPES.COMPETITIVE]: `Competitive query routed to ${selectedProvider}`,
			[RESEARCH_QUERY_TYPES.HYBRID]: `Hybrid query routed to ${selectedProvider} based on context`,
			[RESEARCH_QUERY_TYPES.GENERAL]: `General query routed to ${selectedProvider}`
		};
		return explanations[queryType] || `Query routed to ${selectedProvider}`;
	}

	/**
	 * Build routing rules map from configuration object.
	 * @param {Object} configRules - keys are query types, values arrays of rule objects
	 * @returns {Map}
	 */
	initializeRoutingRulesFromConfig(configRules) {
		const rules = new Map();
		for (const [queryType, ruleArray] of Object.entries(configRules)) {
			rules.set(queryType.toLowerCase(), ruleArray);
		}
		return rules;
	}

	/**
	 * Expose internal stats for monitoring.
	 */
	getRoutingStats() {
		return {
			registeredProviders: Array.from(this.providers.keys()),
			routingRules: Object.fromEntries(this.routingRules),
			fallbackOrder: this.fallbackOrder
		};
	}
}


