import { RESEARCH_PROVIDERS, RESEARCH_QUERY_TYPES, DISCOVERY_STAGES } from './constants.js';

/**
 * Build a uniform adapter around a concrete provider implementation so the
 * ResearchRouter can treat all providers the same via `execute` + `isAvailable`.
 * @param {string} providerName
 * @param {Object} providerInstance
 * @returns {{ execute(queryType:string, query:string, context:Object):Promise<any>, isAvailable(context:Object):Promise<boolean> }}
 */
export function buildProviderAdapter(providerName, providerInstance) {
	// Helper to safely call provider method if exists
	const safe = (fn, defaultVal = undefined) => (typeof fn === 'function' ? fn.bind(providerInstance) : () => defaultVal);

	switch (providerName) {
		case RESEARCH_PROVIDERS.CONTEXT7:
			return {
				async execute(queryType, query, context) {
					const { technologies = [], projectType } = context;
					if (technologies.length > 0) {
						return await safe(providerInstance.validateTechnicalFeasibility)(technologies, query);
					}
					if (projectType) {
						return await safe(providerInstance.getArchitectureRecommendations)({
							projectType,
							features: context.features || [],
							scale: context.scale || 'medium'
						});
					}
					return await safe(providerInstance.resolveLibraryId)(query);
				},
				async isAvailable() {
					return await safe(providerInstance.isAvailable, true)();
				}
			};

		case RESEARCH_PROVIDERS.TAVILY:
			return {
				async execute(queryType, query, context) {
					const { stage, projectType, apiKey } = context;
					if (queryType === RESEARCH_QUERY_TYPES.MARKET || stage === DISCOVERY_STAGES.MARKET_RESEARCH) {
						return await safe(providerInstance.researchMarketOpportunity)({
							projectType,
							targetMarket: context.targetMarket,
							competitors: context.competitors,
							features: context.features
						}, { apiKey });
					}
					// Fallback to generic search
					return await safe(providerInstance.search)(query, {
						apiKey,
						searchDepth: 'advanced',
						maxResults: 10,
						includeAnswer: true
					});
				},
				async isAvailable(context) {
					return await safe(providerInstance.isAvailable, true)(context?.apiKey);
				}
			};

		case RESEARCH_PROVIDERS.PERPLEXITY:
			return {
				async execute(_queryType, query, context) {
					const { apiKey, modelId = 'llama-3.1-sonar-small-128k-online' } = context;
					return await safe(providerInstance.generateText)({
						apiKey,
						modelId,
						messages: [{ role: 'user', content: `Research and provide comprehensive information about: ${query}` }],
						maxTokens: 2000,
						temperature: 0.1
					});
				},
				async isAvailable(context) {
					return !!context?.apiKey;
				}
			};

		default:
			return {
				execute: async () => { throw new Error(`No adapter for provider ${providerName}`); },
				isAvailable: async () => false
			};
	}
} 