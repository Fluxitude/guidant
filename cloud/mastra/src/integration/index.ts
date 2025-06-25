/**
 * Guidant Mastra Integration
 * 
 * Provides utilities for integrating the Strategic Agent Synthesis
 * architecture with Guidant task management system.
 */

import { Mastra } from '@mastra/core';
import { Logger } from '@mastra/loggers';
import { MCPClient } from '@mastra/mcp';
import { AgentSynthesisRouter, SynthesisRequest, SynthesisResponse } from '../synthesis/router.js';
import { TechnicalResearchAgent } from '../agents/technical-research.js';
import { MarketResearchAgent } from '../agents/market-research.js';
import { UIUXResearchAgent } from '../agents/uiux-research.js';
import { GeneralResearchAgent } from '../agents/general-research.js';
import { loadConfig } from '../utils/config.js';

export interface GuidantMastraIntegration {
  mastra: Mastra;
  mcpClient: MCPClient;
  synthesisRouter: AgentSynthesisRouter;
  performResearch: (request: GuidantResearchRequest) => Promise<GuidantResearchResponse>;
  cleanup: () => Promise<void>;
}

export interface GuidantResearchRequest {
  query: string;
  context?: {
    taskId?: string;
    taskTitle?: string;
    taskDescription?: string;
    projectContext?: string;
    codebase?: {
      language?: string;
      framework?: string;
      libraries?: string[];
    };
    market?: {
      industry?: string;
      competitors?: string[];
    };
    uiux?: {
      designPatterns?: string[];
      competitors?: string[];
    };
  };
  options?: {
    depth?: 'basic' | 'detailed' | 'comprehensive';
    domains?: ('technical' | 'market' | 'uiux')[];
    maxResults?: number;
    includeRecommendations?: boolean;
    synthesizeFindings?: boolean;
  };
}

export interface GuidantResearchResponse {
  success: boolean;
  summary?: string;
  findings?: {
    technical?: any;
    market?: any;
    uiux?: any;
  };
  insights?: Array<{
    domain: string;
    insight: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  recommendations?: Array<{
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    domains: string[];
  }>;
  sources?: string[];
  metadata?: {
    executionTime: number;
    domainsAnalyzed: string[];
    timestamp: string;
  };
  error?: string;
}

/**
 * Create Guidant Mastra Integration
 */
export function createGuidantIntegration(logger: Logger): GuidantMastraIntegration {
  // Load configuration
  const config = loadConfig();
  
  // Create MCP client
  const mcpClient = new MCPClient({
    id: 'guidant-integration',
    servers: {},
    timeout: config.server?.timeout || 30000,
    logger
  });
  
  // Create agents
  const technicalAgent = new TechnicalResearchAgent(mcpClient, logger);
  const marketAgent = new MarketResearchAgent(mcpClient, logger);
  const uiuxAgent = new UIUXResearchAgent(mcpClient, logger);
  const generalAgent = new GeneralResearchAgent(
    mcpClient, 
    logger,
    technicalAgent,
    marketAgent,
    uiuxAgent
  );
  
  // Create Mastra instance
  const mastra = new Mastra({
    agents: {
      technicalResearch: technicalAgent,
      marketResearch: marketAgent,
      uiuxResearch: uiuxAgent,
      generalResearch: generalAgent
    },
    logger
  });
  
  // Create synthesis router
  const synthesisRouter = new AgentSynthesisRouter({
    technicalAgent,
    marketAgent,
    uiuxAgent,
    generalAgent
  }, logger);
  
  /**
   * Perform research using the synthesis architecture
   */
  async function performResearch(request: GuidantResearchRequest): Promise<GuidantResearchResponse> {
    const startTime = Date.now();
    
    try {
      // Convert Guidant request to synthesis request
      const synthesisRequest = convertToSynthesisRequest(request);
      
      // Route the request through the synthesis router
      const response = await synthesisRouter.route(synthesisRequest);
      
      // Convert synthesis response to Guidant response
      return convertToGuidantResponse(response, startTime);
      
    } catch (error) {
      logger.error('Error performing research', { error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during research',
        metadata: {
          executionTime: Date.now() - startTime,
          domainsAnalyzed: [],
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * Convert Guidant research request to synthesis request
   */
  function convertToSynthesisRequest(request: GuidantResearchRequest): SynthesisRequest {
    // Determine which domains to use
    const domains = request.options?.domains || determineDomains(request);
    
    // Determine which tools to use based on domains
    const tools = determineTools(domains);
    
    // Create context for the general research agent
    const context = {
      query: request.query,
      domains,
      depth: request.options?.depth || 'detailed',
      maxResults: request.options?.maxResults,
      includeRecommendations: request.options?.includeRecommendations,
      synthesizeFindings: request.options?.synthesizeFindings,
      
      // Add domain-specific context
      technical: domains.includes('technical') ? {
        libraries: request.context?.codebase?.libraries,
        programmingLanguages: request.context?.codebase?.language ? [request.context.codebase.language] : undefined,
        frameworks: request.context?.codebase?.framework ? [request.context.codebase.framework] : undefined,
        documentationDepth: request.options?.depth,
        codeExamples: true
      } : undefined,
      
      market: domains.includes('market') ? {
        industry: request.context?.market?.industry,
        competitors: request.context?.market?.competitors,
        researchDepth: request.options?.depth,
        includeTrends: true
      } : undefined,
      
      uiux: domains.includes('uiux') ? {
        competitors: request.context?.uiux?.competitors,
        designPatterns: request.context?.uiux?.designPatterns,
        interactionDepth: request.options?.depth as any,
        captureScreenshots: true
      } : undefined
    };
    
    return {
      operation: `guidant-research-${request.query}`,
      context,
      tools,
      parameters: {
        taskId: request.context?.taskId,
        taskTitle: request.context?.taskTitle,
        projectContext: request.context?.projectContext
      }
    };
  }
  
  /**
   * Determine which domains to use based on the request
   */
  function determineDomains(request: GuidantResearchRequest): ('technical' | 'market' | 'uiux')[] {
    // If domains are explicitly specified, use them
    if (request.options?.domains && request.options.domains.length > 0) {
      return request.options.domains;
    }
    
    const domains: ('technical' | 'market' | 'uiux')[] = [];
    const query = request.query.toLowerCase();
    
    // Check for technical indicators
    if (
      request.context?.codebase ||
      query.includes('code') ||
      query.includes('library') ||
      query.includes('framework') ||
      query.includes('implementation') ||
      query.includes('architecture')
    ) {
      domains.push('technical');
    }
    
    // Check for market indicators
    if (
      request.context?.market ||
      query.includes('market') ||
      query.includes('competitor') ||
      query.includes('industry') ||
      query.includes('business') ||
      query.includes('trend')
    ) {
      domains.push('market');
    }
    
    // Check for UI/UX indicators
    if (
      request.context?.uiux ||
      query.includes('design') ||
      query.includes('interface') ||
      query.includes('ui') ||
      query.includes('ux') ||
      query.includes('user experience')
    ) {
      domains.push('uiux');
    }
    
    // If no domains were identified, default to technical
    if (domains.length === 0) {
      domains.push('technical');
    }
    
    return domains;
  }
  
  /**
   * Determine which tools to use based on domains
   */
  function determineTools(domains: ('technical' | 'market' | 'uiux')[]): string[] {
    const tools: string[] = [];
    
    if (domains.includes('technical')) {
      tools.push('resolve-library-id', 'get-library-docs');
    }
    
    if (domains.includes('market')) {
      tools.push('tavily-search', 'firecrawl_scrape', 'firecrawl_extract');
    }
    
    if (domains.includes('uiux')) {
      tools.push('browser_navigate', 'browser_snapshot', 'browser_extract');
    }
    
    return tools;
  }
  
  /**
   * Convert synthesis response to Guidant response
   */
  function convertToGuidantResponse(
    response: SynthesisResponse,
    startTime: number
  ): GuidantResearchResponse {
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Unknown error',
        metadata: {
          executionTime: Date.now() - startTime,
          domainsAnalyzed: [],
          timestamp: new Date().toISOString()
        }
      };
    }
    
    const result = response.data;
    
    return {
      success: true,
      summary: result.summary,
      findings: {
        technical: result.technicalFindings,
        market: result.marketFindings,
        uiux: result.uiuxFindings
      },
      insights: result.synthesizedInsights?.map(insight => ({
        domain: insight.domain,
        insight: insight.insight,
        confidence: insight.confidence
      })),
      recommendations: result.recommendations?.map(rec => ({
        recommendation: rec.recommendation,
        priority: rec.priority,
        domains: rec.domains
      })),
      sources: result.sources?.map(source => 
        typeof source === 'string' ? source : source.source || source.url || JSON.stringify(source)
      ),
      metadata: {
        executionTime: response.metadata.executionTime,
        domainsAnalyzed: result.metadata?.domainsAnalyzed || [],
        timestamp: new Date().toISOString()
      }
    };
  }
  
  /**
   * Clean up resources
   */
  async function cleanup(): Promise<void> {
    try {
      // Disconnect MCP client
      await mcpClient.disconnect();
      
      // Clean up agents
      await Promise.all([
        technicalAgent.cleanup?.(),
        marketAgent.cleanup?.(),
        uiuxAgent.cleanup?.(),
        generalAgent.cleanup?.()
      ].filter(Boolean));
      
      logger.info('Guidant Mastra integration cleaned up successfully');
    } catch (error) {
      logger.error('Error cleaning up Guidant Mastra integration', { error });
    }
  }
  
  // Initialize the integration
  (async () => {
    try {
      // Connect MCP client
      await mcpClient.connect();
      
      // Initialize synthesis router
      const tools = await mcpClient.getTools();
      await synthesisRouter.initialize(tools);
      
      logger.info('Guidant Mastra integration initialized successfully');
    } catch (error) {
      logger.error('Error initializing Guidant Mastra integration', { error });
    }
  })();
  
  return {
    mastra,
    mcpClient,
    synthesisRouter,
    performResearch,
    cleanup
  };
} 