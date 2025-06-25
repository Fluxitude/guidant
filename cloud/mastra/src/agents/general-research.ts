/**
 * General Research Agent
 * 
 * Orchestrates complex research tasks requiring multiple domains of expertise
 * by combining capabilities from all specialized agents (Technical, Market, UI/UX).
 */

import { Agent } from '@mastra/core';
import { Logger } from '@mastra/loggers';
import { MCPClient } from '@mastra/mcp';
import { SynthesisRequest, SynthesisResponse } from '../synthesis/router.js';
import { TechnicalResearchAgent, TechnicalResearchContext, TechnicalResearchResult } from './technical-research.js';
import { MarketResearchAgent, MarketResearchContext, MarketResearchResult } from './market-research.js';
import { UIUXResearchAgent, UIUXResearchContext, UIUXResearchResult } from './uiux-research.js';

export interface GeneralResearchContext {
  query: string;
  domains: ('technical' | 'market' | 'uiux')[];
  priority?: 'technical' | 'market' | 'uiux';
  depth?: 'basic' | 'detailed' | 'comprehensive';
  
  // Technical research context
  technical?: TechnicalResearchContext;
  
  // Market research context
  market?: MarketResearchContext;
  
  // UI/UX research context
  uiux?: UIUXResearchContext;
  
  // Additional parameters
  maxResults?: number;
  includeRecommendations?: boolean;
  synthesizeFindings?: boolean;
}

export interface GeneralResearchResult {
  summary: string;
  technicalFindings?: Partial<TechnicalResearchResult>;
  marketFindings?: Partial<MarketResearchResult>;
  uiuxFindings?: Partial<UIUXResearchResult>;
  synthesizedInsights: SynthesizedInsight[];
  recommendations: ResearchRecommendation[];
  sources: ResearchSource[];
  metadata: {
    queryTime: string;
    domainsAnalyzed: string[];
    confidenceScore: number;
    completeness: number;
  };
}

export interface SynthesizedInsight {
  domain: string;
  insight: string;
  confidence: 'high' | 'medium' | 'low';
  supportingEvidence: string[];
  crossDomainImplications: CrossDomainImplication[];
}

export interface CrossDomainImplication {
  targetDomain: string;
  implication: string;
  actionability: 'high' | 'medium' | 'low';
}

export interface ResearchRecommendation {
  recommendation: string;
  rationale: string;
  domains: string[];
  priority: 'high' | 'medium' | 'low';
  implementation: string;
  expectedOutcome: string;
}

export interface ResearchSource {
  domain: string;
  source: string;
  relevance: 'high' | 'medium' | 'low';
  timestamp: string;
}

/**
 * General Research Agent - Orchestrates complex multi-domain research
 */
export class GeneralResearchAgent extends Agent {
  private mcpClient: MCPClient;
  private logger: Logger;
  private technicalAgent: TechnicalResearchAgent;
  private marketAgent: MarketResearchAgent;
  private uiuxAgent: UIUXResearchAgent;
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();

  constructor(
    mcpClient: MCPClient,
    logger: Logger,
    technicalAgent: TechnicalResearchAgent,
    marketAgent: MarketResearchAgent,
    uiuxAgent: UIUXResearchAgent
  ) {
    super({
      name: 'GeneralResearchAgent',
      description: 'Orchestrator for complex multi-domain research tasks',
      instructions: `
        You are a comprehensive research orchestrator that:
        1. Breaks down complex research queries into domain-specific subqueries
        2. Delegates research to specialized agents (Technical, Market, UI/UX)
        3. Synthesizes findings across domains into cohesive insights
        4. Identifies cross-domain implications and opportunities
        5. Provides actionable recommendations based on holistic analysis
        
        Always prioritize depth and accuracy over breadth.
        Ensure findings are properly attributed to their respective domains.
        Highlight connections and contradictions between different domains.
      `
    });
    
    this.mcpClient = mcpClient;
    this.logger = logger;
    this.technicalAgent = technicalAgent;
    this.marketAgent = marketAgent;
    this.uiuxAgent = uiuxAgent;
  }

  /**
   * Synthesize general research request
   */
  async synthesize(request: SynthesisRequest): Promise<GeneralResearchResult> {
    this.logger.info('Starting general research synthesis', { 
      operation: request.operation,
      tools: request.tools 
    });

    const context = request.context as GeneralResearchContext;
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      this.logger.info('Returning cached general research result');
      return this.cache.get(cacheKey);
    }

    try {
      const startTime = Date.now();
      
      // Step 1: Determine which domains to research
      const domains = context.domains || this.determineDomains(context.query);
      
      this.logger.info('Research domains determined', { domains });
      
      // Initialize result structure
      const result: GeneralResearchResult = {
        summary: '',
        synthesizedInsights: [],
        recommendations: [],
        sources: [],
        metadata: {
          queryTime: new Date().toISOString(),
          domainsAnalyzed: domains,
          confidenceScore: 0,
          completeness: 0
        }
      };

      // Step 2: Execute domain-specific research in parallel
      const researchPromises: Promise<any>[] = [];
      
      if (domains.includes('technical')) {
        researchPromises.push(this.executeTechnicalResearch(context));
      }
      
      if (domains.includes('market')) {
        researchPromises.push(this.executeMarketResearch(context));
      }
      
      if (domains.includes('uiux')) {
        researchPromises.push(this.executeUIUXResearch(context));
      }
      
      // Wait for all research to complete
      const domainResults = await Promise.allSettled(researchPromises);
      
      // Step 3: Process results from each domain
      let successfulDomains = 0;
      
      for (let i = 0; i < domainResults.length; i++) {
        const domainResult = domainResults[i];
        const domain = domains[i];
        
        if (domainResult.status === 'fulfilled') {
          successfulDomains++;
          
          // Store domain-specific findings
          if (domain === 'technical') {
            result.technicalFindings = this.extractKeyTechnicalFindings(domainResult.value);
          } else if (domain === 'market') {
            result.marketFindings = this.extractKeyMarketFindings(domainResult.value);
          } else if (domain === 'uiux') {
            result.uiuxFindings = this.extractKeyUIUXFindings(domainResult.value);
          }
          
          // Collect sources
          this.collectSources(result.sources, domain, domainResult.value);
          
        } else {
          this.logger.warn(`Research failed for domain: ${domain}`, { 
            error: domainResult.reason 
          });
        }
      }
      
      // Step 4: Synthesize findings across domains
      if (context.synthesizeFindings !== false) {
        result.synthesizedInsights = await this.synthesizeFindings(result);
      }
      
      // Step 5: Generate recommendations
      if (context.includeRecommendations !== false) {
        result.recommendations = await this.generateRecommendations(result);
      }
      
      // Step 6: Create summary
      result.summary = await this.createResearchSummary(result);
      
      // Calculate metadata
      result.metadata.confidenceScore = this.calculateConfidenceScore(result, successfulDomains, domains.length);
      result.metadata.completeness = (successfulDomains / domains.length) * 100;
      
      // Cache the result
      this.cacheResult(cacheKey, result);

      const executionTime = Date.now() - startTime;
      this.logger.info('General research synthesis completed', {
        executionTime,
        domainsAnalyzed: successfulDomains,
        insightsGenerated: result.synthesizedInsights.length,
        recommendationsGenerated: result.recommendations.length
      });

      return result;

    } catch (error) {
      this.logger.error('Error in general research synthesis', { error });
      throw error;
    }
  }

  /**
   * Determine research domains from query if not explicitly specified
   */
  private determineDomains(query: string): ('technical' | 'market' | 'uiux')[] {
    const domains: ('technical' | 'market' | 'uiux')[] = [];
    
    // Technical domain keywords
    const technicalKeywords = [
      'code', 'library', 'framework', 'api', 'architecture', 'implementation',
      'programming', 'software', 'development', 'technical', 'technology',
      'integration', 'compatibility', 'documentation'
    ];
    
    // Market domain keywords
    const marketKeywords = [
      'market', 'competitor', 'business', 'industry', 'trend', 'opportunity',
      'threat', 'customer', 'pricing', 'strategy', 'growth', 'revenue',
      'segment', 'audience', 'commercial', 'financial'
    ];
    
    // UI/UX domain keywords
    const uiuxKeywords = [
      'design', 'interface', 'user experience', 'ui', 'ux', 'usability',
      'accessibility', 'visual', 'interaction', 'layout', 'wireframe',
      'prototype', 'user flow', 'user journey', 'user testing'
    ];
    
    // Check query against domain keywords
    const lowerQuery = query.toLowerCase();
    
    if (technicalKeywords.some(keyword => lowerQuery.includes(keyword))) {
      domains.push('technical');
    }
    
    if (marketKeywords.some(keyword => lowerQuery.includes(keyword))) {
      domains.push('market');
    }
    
    if (uiuxKeywords.some(keyword => lowerQuery.includes(keyword))) {
      domains.push('uiux');
    }
    
    // If no domains matched, include all domains for comprehensive research
    if (domains.length === 0) {
      return ['technical', 'market', 'uiux'];
    }
    
    return domains;
  }

  /**
   * Execute technical research
   */
  private async executeTechnicalResearch(context: GeneralResearchContext): Promise<TechnicalResearchResult> {
    try {
      const technicalContext = context.technical || this.createTechnicalContext(context);
      
      const technicalRequest: SynthesisRequest = {
        operation: `technical-research-${context.query}`,
        context: technicalContext,
        tools: ['resolve-library-id', 'get-library-docs'],
        parameters: {}
      };
      
      return await this.technicalAgent.synthesize(technicalRequest);
    } catch (error) {
      this.logger.error('Error in technical research execution', { error });
      throw error;
    }
  }

  /**
   * Execute market research
   */
  private async executeMarketResearch(context: GeneralResearchContext): Promise<MarketResearchResult> {
    try {
      const marketContext = context.market || this.createMarketContext(context);
      
      const marketRequest: SynthesisRequest = {
        operation: `market-research-${context.query}`,
        context: marketContext,
        tools: ['tavily-search', 'firecrawl_scrape'],
        parameters: {}
      };
      
      return await this.marketAgent.synthesize(marketRequest);
    } catch (error) {
      this.logger.error('Error in market research execution', { error });
      throw error;
    }
  }

  /**
   * Execute UI/UX research
   */
  private async executeUIUXResearch(context: GeneralResearchContext): Promise<UIUXResearchResult> {
    try {
      const uiuxContext = context.uiux || this.createUIUXContext(context);
      
      const uiuxRequest: SynthesisRequest = {
        operation: `uiux-research-${context.query}`,
        context: uiuxContext,
        tools: ['browser_navigate', 'browser_snapshot', 'browser_extract'],
        parameters: {}
      };
      
      return await this.uiuxAgent.synthesize(uiuxRequest);
    } catch (error) {
      this.logger.error('Error in UI/UX research execution', { error });
      throw error;
    }
  }

  /**
   * Create technical context from general context
   */
  private createTechnicalContext(context: GeneralResearchContext): TechnicalResearchContext {
    // Extract relevant technical parameters from the general query
    const query = context.query.toLowerCase();
    
    // Extract potential libraries/technologies from query
    const techKeywords = [
      'react', 'angular', 'vue', 'node', 'express', 'next.js', 'typescript',
      'javascript', 'python', 'django', 'flask', 'ruby', 'rails', 'php',
      'laravel', 'dotnet', 'java', 'spring', 'go', 'rust', 'aws', 'azure',
      'gcp', 'kubernetes', 'docker', 'terraform', 'graphql', 'rest'
    ];
    
    const libraries = techKeywords.filter(tech => query.includes(tech.toLowerCase()));
    
    return {
      libraries: libraries.length > 0 ? libraries : undefined,
      documentationDepth: context.depth,
      codeExamples: true
    };
  }

  /**
   * Create market context from general context
   */
  private createMarketContext(context: GeneralResearchContext): MarketResearchContext {
    // Extract industry and competitors if mentioned in query
    const query = context.query;
    
    // This is a simplified implementation
    // In a real implementation, we would use NLP to extract entities
    
    return {
      researchDepth: context.depth,
      includeTrends: true
    };
  }

  /**
   * Create UI/UX context from general context
   */
  private createUIUXContext(context: GeneralResearchContext): UIUXResearchContext {
    // Extract websites and design patterns if mentioned in query
    const query = context.query;
    
    // This is a simplified implementation
    // In a real implementation, we would use NLP to extract entities
    
    return {
      interactionDepth: context.depth as any,
      captureScreenshots: true
    };
  }

  /**
   * Extract key technical findings
   */
  private extractKeyTechnicalFindings(result: TechnicalResearchResult): Partial<TechnicalResearchResult> {
    // Extract most important technical findings
    return {
      libraries: result.libraries.slice(0, 3),
      bestPractices: result.bestPractices.slice(0, 5),
      architectureRecommendations: result.architectureRecommendations.slice(0, 2),
      implementationGuide: result.implementationGuide.slice(0, 3)
    };
  }

  /**
   * Extract key market findings
   */
  private extractKeyMarketFindings(result: MarketResearchResult): Partial<MarketResearchResult> {
    // Extract most important market findings
    return {
      marketOverview: result.marketOverview,
      competitorAnalysis: result.competitorAnalysis.slice(0, 3),
      marketTrends: result.marketTrends.slice(0, 3),
      opportunities: result.opportunities.slice(0, 3),
      threats: result.threats.slice(0, 3)
    };
  }

  /**
   * Extract key UI/UX findings
   */
  private extractKeyUIUXFindings(result: UIUXResearchResult): Partial<UIUXResearchResult> {
    // Extract most important UI/UX findings
    return {
      interfaceAnalysis: result.interfaceAnalysis.slice(0, 2),
      designPatterns: result.designPatterns.slice(0, 3),
      bestPractices: result.bestPractices.slice(0, 3),
      competitiveComparison: result.competitiveComparison
    };
  }

  /**
   * Collect sources from domain results
   */
  private collectSources(
    targetSources: ResearchSource[],
    domain: string,
    result: any
  ): void {
    if (!result || !result.sources) return;
    
    const sources = Array.isArray(result.sources) ? result.sources : [];
    
    for (const source of sources) {
      let sourceString = '';
      
      if (typeof source === 'string') {
        sourceString = source;
      } else if (typeof source === 'object') {
        sourceString = source.url || source.title || JSON.stringify(source);
      }
      
      if (sourceString) {
        targetSources.push({
          domain,
          source: sourceString,
          relevance: 'medium',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Synthesize findings across domains
   */
  private async synthesizeFindings(result: GeneralResearchResult): Promise<SynthesizedInsight[]> {
    const insights: SynthesizedInsight[] = [];
    
    // This is a placeholder implementation
    // In a real implementation, we would use LLM to synthesize findings
    
    // Technical + Market synthesis
    if (result.technicalFindings && result.marketFindings) {
      insights.push({
        domain: 'technical + market',
        insight: 'Technical capabilities align with market opportunities',
        confidence: 'medium',
        supportingEvidence: [
          'Technical architecture supports scalability needs identified in market analysis',
          'Library choices compatible with market growth projections'
        ],
        crossDomainImplications: [
          {
            targetDomain: 'uiux',
            implication: 'Technical architecture enables responsive design needed for target market',
            actionability: 'high'
          }
        ]
      });
    }
    
    // Technical + UI/UX synthesis
    if (result.technicalFindings && result.uiuxFindings) {
      insights.push({
        domain: 'technical + uiux',
        insight: 'Technical implementation supports identified UI/UX patterns',
        confidence: 'high',
        supportingEvidence: [
          'Component architecture aligns with design pattern needs',
          'Performance capabilities support smooth interactions'
        ],
        crossDomainImplications: [
          {
            targetDomain: 'market',
            implication: 'Technical-UI integration creates market differentiation opportunity',
            actionability: 'medium'
          }
        ]
      });
    }
    
    // Market + UI/UX synthesis
    if (result.marketFindings && result.uiuxFindings) {
      insights.push({
        domain: 'market + uiux',
        insight: 'UI/UX competitive advantages address market gaps',
        confidence: 'medium',
        supportingEvidence: [
          'Competitor UI analysis reveals opportunity for improved user flows',
          'Market trends align with modern design patterns'
        ],
        crossDomainImplications: [
          {
            targetDomain: 'technical',
            implication: 'Market-driven UI requirements need specific technical capabilities',
            actionability: 'high'
          }
        ]
      });
    }
    
    // Tri-domain synthesis (if all domains were researched)
    if (result.technicalFindings && result.marketFindings && result.uiuxFindings) {
      insights.push({
        domain: 'technical + market + uiux',
        insight: 'Comprehensive strategy aligns technical capabilities, market opportunities, and user experience',
        confidence: 'high',
        supportingEvidence: [
          'Technical architecture supports both market scalability and UI performance needs',
          'Design patterns satisfy market differentiation while leveraging technical strengths'
        ],
        crossDomainImplications: [
          {
            targetDomain: 'implementation',
            implication: 'Phased approach focusing on core technical-UI integration first, followed by market expansion',
            actionability: 'high'
          }
        ]
      });
    }
    
    return insights;
  }

  /**
   * Generate recommendations based on findings
   */
  private async generateRecommendations(result: GeneralResearchResult): Promise<ResearchRecommendation[]> {
    const recommendations: ResearchRecommendation[] = [];
    
    // This is a placeholder implementation
    // In a real implementation, we would use LLM to generate recommendations
    
    if (result.technicalFindings) {
      recommendations.push({
        recommendation: 'Adopt modern component architecture',
        rationale: 'Supports scalability and maintainability needs',
        domains: ['technical'],
        priority: 'high',
        implementation: 'Implement using React with TypeScript',
        expectedOutcome: 'Improved development velocity and code quality'
      });
    }
    
    if (result.marketFindings) {
      recommendations.push({
        recommendation: 'Focus on emerging market segment',
        rationale: 'High growth potential with limited competition',
        domains: ['market'],
        priority: 'medium',
        implementation: 'Develop targeted marketing campaign',
        expectedOutcome: 'Increased market share in high-value segment'
      });
    }
    
    if (result.uiuxFindings) {
      recommendations.push({
        recommendation: 'Implement streamlined user onboarding',
        rationale: 'Addresses key pain point in competitor interfaces',
        domains: ['uiux'],
        priority: 'high',
        implementation: 'Develop guided welcome flow with progress tracking',
        expectedOutcome: 'Improved user retention and satisfaction'
      });
    }
    
    // Cross-domain recommendations
    if (result.synthesizedInsights.length > 0) {
      recommendations.push({
        recommendation: 'Integrate technical capabilities with UX improvements',
        rationale: 'Creates differentiation in competitive market',
        domains: ['technical', 'uiux', 'market'],
        priority: 'high',
        implementation: 'Form cross-functional team to align development with design and market strategy',
        expectedOutcome: 'Cohesive product with technical excellence and market fit'
      });
    }
    
    return recommendations;
  }

  /**
   * Create research summary
   */
  private async createResearchSummary(result: GeneralResearchResult): Promise<string> {
    // This is a placeholder implementation
    // In a real implementation, we would use LLM to generate summary
    
    const domains = [];
    if (result.technicalFindings) domains.push('technical');
    if (result.marketFindings) domains.push('market');
    if (result.uiuxFindings) domains.push('UI/UX');
    
    return `Comprehensive research across ${domains.join(', ')} domains reveals opportunities for integration between technical capabilities, market positioning, and user experience design. Key insights include alignment between technical architecture and market needs, potential for UI/UX differentiation, and strategic implementation approaches that leverage strengths across domains.`;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidenceScore(
    result: GeneralResearchResult,
    successfulDomains: number,
    totalDomains: number
  ): number {
    // Base confidence on ratio of successful domains
    let confidenceScore = (successfulDomains / totalDomains) * 10;
    
    // Adjust based on data quality indicators
    if (result.sources.length > 10) confidenceScore += 1;
    if (result.synthesizedInsights.length > 3) confidenceScore += 1;
    
    // Cap at 10
    return Math.min(Math.round(confidenceScore), 10);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(request: SynthesisRequest): string {
    return `general-${JSON.stringify(request.operation)}-${JSON.stringify(request.context)}`;
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(cacheKey: string): boolean {
    if (!this.cache.has(cacheKey)) {
      return false;
    }
    
    const expiryTime = this.cacheExpiry.get(cacheKey) || 0;
    return Date.now() < expiryTime;
  }

  /**
   * Cache result with expiry
   */
  private cacheResult(cacheKey: string, result: any, expiryMinutes: number = 30): void {
    this.cache.set(cacheKey, result);
    this.cacheExpiry.set(cacheKey, Date.now() + (expiryMinutes * 60 * 1000));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up General Research Agent resources');
    this.cache.clear();
    this.cacheExpiry.clear();
  }
} 