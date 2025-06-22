/**
 * tools/discovery/research-router-factory.js
 * Factory function to initialize ResearchRouter with provider instances
 */

import { ResearchRouter } from '../../core/discovery/research-router.js';
import { RESEARCH_PROVIDERS } from '../../core/discovery/constants.js';

// Import provider instances from ai-services-unified
import { 
	Context7Provider,
	TavilyProvider,
	PerplexityAIProvider
} from '../../../../src/ai-providers/index.js';

/**
 * Initialize and configure ResearchRouter with provider instances
 * @returns {Promise<ResearchRouter>} Configured ResearchRouter instance
 */
export async function initializeResearchRouter() {
	const router = new ResearchRouter();

	try {
		// Create provider instances
		const context7Provider = new Context7Provider();
		const tavilyProvider = new TavilyProvider();
		const perplexityProvider = new PerplexityAIProvider();

		// Register providers with the router
		router.registerProvider(RESEARCH_PROVIDERS.CONTEXT7, context7Provider);
		router.registerProvider(RESEARCH_PROVIDERS.TAVILY, tavilyProvider);
		router.registerProvider(RESEARCH_PROVIDERS.PERPLEXITY, perplexityProvider);

		return router;
	} catch (error) {
		console.error('Failed to initialize ResearchRouter:', error);
		throw new Error(`ResearchRouter initialization failed: ${error.message}`);
	}
}

/**
 * Get a singleton instance of ResearchRouter (cached)
 * @returns {Promise<ResearchRouter>} Cached ResearchRouter instance
 */
let cachedRouter = null;
export async function getResearchRouter() {
	if (!cachedRouter) {
		cachedRouter = await initializeResearchRouter();
	}
	return cachedRouter;
}
