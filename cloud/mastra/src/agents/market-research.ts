/**
 * Market Research Agent
 * 
 * Specializes in market analysis, competitive research, and business intelligence
 * using Tavily search and Firecrawl web scraping capabilities.
 */

import { Agent } from '@mastra/core/agent';
import type { Logger } from '@mastra/loggers';
import { MCPClient } from '@mastra/mcp';
import { vertexai } from '@ai-sdk/vertexai';
import { SynthesisRequest } from '../synthesis/router.js';

export interface MarketResearchContext {
  industry?: string;
  targetMarket?: string;
  competitors?: string[];
  products?: string[];
  geographicScope?: string[];
  timeframe?: string;
  researchDepth?: 'basic' | 'detailed' | 'comprehensive';
  includeFinancials?: boolean;
  includeTrends?: boolean;
}

export interface MarketResearchResult {
  marketOverview: MarketOverview;
  competitorAnalysis: CompetitorAnalysis[];
  marketTrends: MarketTrend[];
  opportunities: MarketOpportunity[];
  threats: MarketThreat[];
  recommendations: MarketRecommendation[];
  sources: ResearchSource[];
  metadata: ResearchMetadata;
}

export interface MarketOverview {
  marketSize: string;
  growthRate: string;
  keySegments: string[];
  majorPlayers: string[];
  marketDynamics: string[];
  regulatoryEnvironment: string[];
}

export interface CompetitorAnalysis {
  name: string;
  website: string;
  description: string;
  marketShare: string;
  strengths: string[];
  weaknesses: string[];
  products: ProductInfo[];
  pricing: PricingInfo[];
  marketingStrategy: string[];
  recentNews: NewsItem[];
}

export interface ProductInfo {
  name: string;
  description: string;
  features: string[];
  targetAudience: string;
  pricing: string;
  launchDate?: string;
}

export interface PricingInfo {
  tier: string;
  price: string;
  features: string[];
  targetSegment: string;
}

export interface MarketTrend {
  trend: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  drivers: string[];
  implications: string[];
}

export interface MarketOpportunity {
  opportunity: string;
  description: string;
  marketSize: string;
  difficulty: 'low' | 'medium' | 'high';
  timeToMarket: string;
  requiredResources: string[];
}

export interface MarketThreat {
  threat: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigationStrategies: string[];
}

export interface MarketRecommendation {
  category: string;
  recommendation: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high';
  timeline: string;
  expectedOutcome: string;
}

export interface NewsItem {
  title: string;
  date: string;
  source: string;
  summary: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface ResearchSource {
  url: string;
  title: string;
  type: 'website' | 'article' | 'report' | 'news';
  credibility: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export interface ResearchMetadata {
  researchDate: string;
  dataFreshness: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  limitationsAndCaveats: string[];
}

/**
 * Market Research Agent - Specialized for market analysis and competitive intelligence
 */
export class MarketResearchAgent extends Agent {
  private logger: Logger;
  private mcpClient: MCPClient;
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();

  constructor(mcpClient: MCPClient, logger: Logger) {
    super({
      name: 'MarketResearchAgent',
      description: 'Specialized agent for market analysis and competitive research',
      instructions: `
        You are a market research specialist focused on:
        1. Market size and growth analysis using real-time web data
        2. Competitive landscape mapping and analysis
        3. Industry trend identification and impact assessment
        4. Market opportunity and threat analysis
        5. Strategic recommendations based on market intelligence
        
        Always provide data-driven insights with credible sources.
        Focus on actionable intelligence and strategic implications.
        Include confidence levels and data limitations in your analysis.
      `,
      model: vertexai("gemini-2.5-flash"),
      tools: mcpClient.getToolsets ? mcpClient.getToolsets() : {}
    });
    
    this.logger = logger;
    this.mcpClient = mcpClient;
  }

  /**
   * Synthesize market research request
   */
  async synthesize(request: SynthesisRequest): Promise<MarketResearchResult> {
    this.logger.info('Starting market research synthesis', { 
      operation: request.operation,
      tools: request.tools 
    });

    const context = request.context as MarketResearchContext;
    const cacheKey = this.generateCacheKey(request);

    // Check cache first (shorter expiry for market data)
    if (this.isCacheValid(cacheKey)) {
      this.logger.info('Returning cached market research result');
      return this.cache.get(cacheKey);
    }

    try {
      const result: MarketResearchResult = {
        marketOverview: {
          marketSize: '',
          growthRate: '',
          keySegments: [],
          majorPlayers: [],
          marketDynamics: [],
          regulatoryEnvironment: []
        },
        competitorAnalysis: [],
        marketTrends: [],
        opportunities: [],
        threats: [],
        recommendations: [],
        sources: [],
        metadata: {
          researchDate: new Date().toISOString(),
          dataFreshness: 'current',
          confidenceLevel: 'medium',
          limitationsAndCaveats: []
        }
      };

      // Step 1: Market Overview Research
      result.marketOverview = await this.researchMarketOverview(context);

      // Step 2: Competitor Analysis
      if (context.competitors?.length) {
        result.competitorAnalysis = await this.analyzeCompetitors(context.competitors, context);
      }

      // Step 3: Market Trends Analysis
      if (context.includeTrends) {
        result.marketTrends = await this.identifyMarketTrends(context);
      }

      // Step 4: Opportunity and Threat Analysis
      result.opportunities = await this.identifyOpportunities(context, result);
      result.threats = await this.identifyThreats(context, result);

      // Step 5: Generate Recommendations
      result.recommendations = await this.generateRecommendations(context, result);

      // Cache the result (shorter expiry for market data)
      this.cacheResult(cacheKey, result, 15); // 15 minutes for market data

      this.logger.info('Market research synthesis completed', {
        competitorsAnalyzed: result.competitorAnalysis.length,
        trendsIdentified: result.marketTrends.length,
        opportunitiesFound: result.opportunities.length,
        threatsIdentified: result.threats.length
      });

      return result;

    } catch (error) {
      this.logger.error('Error in market research synthesis', { error });
      throw error;
    }
  }

  /**
   * Research market overview using Tavily search
   */
  private async researchMarketOverview(context: MarketResearchContext): Promise<MarketOverview> {
    try {
      const searchQuery = this.buildMarketOverviewQuery(context);
      const searchResults = await this.performTavilySearch(searchQuery);
      
      if (searchResults?.results?.length > 0) {
        return this.parseMarketOverview(searchResults, context);
      } else {
        this.logger.warn('No search results found for market overview, using fallback');
        return this.createFallbackMarketOverview(context);
      }
    } catch (error) {
      this.logger.error('Error researching market overview', { error, context });
      return this.createFallbackMarketOverview(context);
    }
  }

  /**
   * Analyze competitors using web search and scraping
   */
  private async analyzeCompetitors(
    competitors: string[], 
    context: MarketResearchContext
  ): Promise<CompetitorAnalysis[]> {
    const results: CompetitorAnalysis[] = [];
    
    for (const competitor of competitors) {
      try {
        // Search for competitor information
        const searchQuery = `${competitor} company overview market share products pricing strategy ${context.industry || ''}`;
        const searchResults = await this.performTavilySearch(searchQuery);
        
        // Try to scrape competitor website
        let websiteData = null;
        try {
          websiteData = await this.scrapeCompetitorWebsite(competitor);
        } catch (scrapeError) {
          this.logger.warn(`Failed to scrape website for ${competitor}`, { error: scrapeError });
        }
        
        // Parse competitor data
        if (searchResults?.results?.length > 0 || websiteData) {
          results.push(this.parseCompetitorData(competitor, searchResults, websiteData));
        } else {
          results.push(this.createFallbackCompetitorAnalysis(competitor));
        }
      } catch (error) {
        this.logger.error(`Error analyzing competitor: ${competitor}`, { error });
        results.push(this.createFallbackCompetitorAnalysis(competitor));
      }
    }
    
    return results;
  }

  /**
   * Perform Tavily search using MCP client
   */
  private async performTavilySearch(query: string): Promise<any> {
    try {
      this.logger.info('Performing Tavily search', { query });
      
      // Check if Tavily search is available in MCP tools
      if (!this.mcpClient.tools?.tavilySearch) {
        throw new Error('Tavily search tool not available in MCP client');
      }
      
      // Call Tavily search through MCP client
      const searchResults = await this.mcpClient.tools.tavilySearch({
        query,
        search_depth: 'advanced',
        include_domains: [],
        exclude_domains: [],
        include_answer: true,
        max_results: 10
      });
      
      return searchResults;
    } catch (error) {
      this.logger.error('Error performing Tavily search', { error, query });
      throw error;
    }
  }

  /**
   * Scrape competitor website using Firecrawl
   */
  private async scrapeCompetitorWebsite(competitor: string): Promise<any> {
    try {
      // Format website URL
      let website = competitor.toLowerCase();
      if (!website.includes('.')) {
        website = `${website}.com`;
      }
      if (!website.startsWith('http')) {
        website = `https://${website}`;
      }
      
      this.logger.info('Scraping competitor website', { website });
      
      // Check if Firecrawl is available in MCP tools
      if (!this.mcpClient.tools?.firecrawl) {
        throw new Error('Firecrawl tool not available in MCP client');
      }
      
      // Call Firecrawl through MCP client
      const scrapedData = await this.mcpClient.tools.firecrawl({
        url: website,
        selector: 'main, #content, .content, article, .about, .company, .products, .pricing',
        depth: 1,
        max_pages: 3
      });
      
      return scrapedData;
    } catch (error) {
      this.logger.error('Error scraping competitor website', { error, competitor });
      throw error;
    }
  }

  /**
   * Identify market trends
   */
  private async identifyMarketTrends(context: MarketResearchContext): Promise<MarketTrend[]> {
    try {
      const searchQuery = this.buildTrendsQuery(context);
      const searchResults = await this.performTavilySearch(searchQuery);
      
      if (searchResults?.results?.length > 0) {
        return this.parseTrends(searchResults, context);
      } else {
        return [];
      }
    } catch (error) {
      this.logger.error('Error identifying market trends', { error, context });
      return [];
    }
  }

  /**
   * Identify market opportunities
   */
  private async identifyOpportunities(
    context: MarketResearchContext,
    result: MarketResearchResult
  ): Promise<MarketOpportunity[]> {
    try {
      // Use AI to analyze market overview and competitor data
      const analysisPrompt = `
        Based on the following market research data, identify key market opportunities:
        
        Market Overview: ${JSON.stringify(result.marketOverview)}
        Competitors: ${JSON.stringify(result.competitorAnalysis.map(c => c.name))}
        Trends: ${JSON.stringify(result.marketTrends.map(t => t.trend))}
        
        Identify 3-5 specific market opportunities with details on market size, difficulty, time to market, and required resources.
      `;
      
      const response = await this.mcpClient.chat({
        messages: [{ role: 'user', content: analysisPrompt }],
        model: 'vertexai/gemini-2.5-flash'
      });
      
      // Parse the response to extract opportunities
      const opportunities: MarketOpportunity[] = [];
      
      try {
        const parsedData = JSON.parse(response.content);
        if (Array.isArray(parsedData)) {
          return parsedData;
        }
      } catch (parseError) {
        // If parsing fails, return empty array
        this.logger.warn('Failed to parse opportunities from AI response', { error: parseError });
      }
      
      return opportunities;
    } catch (error) {
      this.logger.error('Error identifying opportunities', { error, context });
      return [];
    }
  }

  /**
   * Identify market threats
   */
  private async identifyThreats(
    context: MarketResearchContext,
    result: MarketResearchResult
  ): Promise<MarketThreat[]> {
    try {
      // Use AI to analyze market overview and competitor data
      const analysisPrompt = `
        Based on the following market research data, identify key market threats:
        
        Market Overview: ${JSON.stringify(result.marketOverview)}
        Competitors: ${JSON.stringify(result.competitorAnalysis.map(c => c.name))}
        Trends: ${JSON.stringify(result.marketTrends.map(t => t.trend))}
        
        Identify 3-5 specific market threats with details on probability, impact, and mitigation strategies.
      `;
      
      const response = await this.mcpClient.chat({
        messages: [{ role: 'user', content: analysisPrompt }],
        model: 'vertexai/gemini-2.5-flash'
      });
      
      // Parse the response to extract threats
      const threats: MarketThreat[] = [];
      
      try {
        const parsedData = JSON.parse(response.content);
        if (Array.isArray(parsedData)) {
          return parsedData;
        }
      } catch (parseError) {
        // If parsing fails, return empty array
        this.logger.warn('Failed to parse threats from AI response', { error: parseError });
      }
      
      return threats;
    } catch (error) {
      this.logger.error('Error identifying threats', { error, context });
      return [];
    }
  }

  /**
   * Generate recommendations based on research
   */
  private async generateRecommendations(
    context: MarketResearchContext,
    result: MarketResearchResult
  ): Promise<MarketRecommendation[]> {
    try {
      // Use AI to generate recommendations
      const analysisPrompt = `
        Based on the following market research data, generate strategic recommendations:
        
        Market Overview: ${JSON.stringify(result.marketOverview)}
        Competitors: ${JSON.stringify(result.competitorAnalysis.map(c => c.name))}
        Trends: ${JSON.stringify(result.marketTrends.map(t => t.trend))}
        Opportunities: ${JSON.stringify(result.opportunities.map(o => o.opportunity))}
        Threats: ${JSON.stringify(result.threats.map(t => t.threat))}
        
        Generate 3-5 specific strategic recommendations with rationale, priority, timeline, and expected outcomes.
      `;
      
      const response = await this.mcpClient.chat({
        messages: [{ role: 'user', content: analysisPrompt }],
        model: 'vertexai/gemini-2.5-flash'
      });
      
      // Parse the response to extract recommendations
      const recommendations: MarketRecommendation[] = [];
      
      try {
        const parsedData = JSON.parse(response.content);
        if (Array.isArray(parsedData)) {
          return parsedData;
        }
      } catch (parseError) {
        // If parsing fails, return empty array
        this.logger.warn('Failed to parse recommendations from AI response', { error: parseError });
      }
      
      return recommendations;
    } catch (error) {
      this.logger.error('Error generating recommendations', { error, context });
      return [];
    }
  }

  /**
   * Build search query for market overview
   */
  private buildMarketOverviewQuery(context: MarketResearchContext): string {
    const industry = context.industry || '';
    const market = context.targetMarket || '';
    const geo = context.geographicScope?.join(' ') || 'global';
    const timeframe = context.timeframe || 'current';
    
    return `${industry} ${market} market size growth rate key segments major players market dynamics regulatory environment ${geo} ${timeframe}`;
  }

  /**
   * Build search query for market trends
   */
  private buildTrendsQuery(context: MarketResearchContext): string {
    const industry = context.industry || '';
    const market = context.targetMarket || '';
    const geo = context.geographicScope?.join(' ') || 'global';
    const timeframe = context.timeframe || 'current and future';
    
    return `${industry} ${market} market trends innovations disruptions emerging technologies future outlook ${geo} ${timeframe}`;
  }

  /**
   * Parse market overview from search results
   */
  private parseMarketOverview(searchResults: any, context: MarketResearchContext): MarketOverview {
    try {
      // Extract relevant information from search results
      const content = searchResults.results.map((r: any) => r.content).join('\n');
      
      // Use AI to extract structured information
      const extractedData = this.extractStructuredData(content, 'market_overview');
      
      if (extractedData) {
        return extractedData as MarketOverview;
      }
      
      return this.createFallbackMarketOverview(context);
    } catch (error) {
      this.logger.error('Error parsing market overview', { error });
      return this.createFallbackMarketOverview(context);
    }
  }

  /**
   * Parse competitor data from search results and website data
   */
  private parseCompetitorData(
    competitor: string, 
    searchResults: any, 
    websiteData: any
  ): CompetitorAnalysis {
    try {
      // Combine search results and website data
      let content = '';
      
      if (searchResults?.results) {
        content += searchResults.results.map((r: any) => r.content).join('\n');
      }
      
      if (websiteData?.content) {
        content += '\n' + websiteData.content;
      }
      
      // Use AI to extract structured information
      const extractedData = this.extractStructuredData(content, 'competitor_analysis', { competitor });
      
      if (extractedData) {
        return extractedData as CompetitorAnalysis;
      }
      
      return this.createFallbackCompetitorAnalysis(competitor);
    } catch (error) {
      this.logger.error('Error parsing competitor data', { error, competitor });
      return this.createFallbackCompetitorAnalysis(competitor);
    }
  }

  /**
   * Parse trends from search results
   */
  private parseTrends(searchResults: any, context: MarketResearchContext): MarketTrend[] {
    try {
      // Extract relevant information from search results
      const content = searchResults.results.map((r: any) => r.content).join('\n');
      
      // Use AI to extract structured information
      const extractedData = this.extractStructuredData(content, 'market_trends');
      
      if (extractedData && Array.isArray(extractedData)) {
        return extractedData as MarketTrend[];
      }
      
      return [];
    } catch (error) {
      this.logger.error('Error parsing market trends', { error });
      return [];
    }
  }

  /**
   * Extract structured data using AI
   */
  private async extractStructuredData(content: string, dataType: string, context: any = {}): Promise<any> {
    try {
      const prompt = `
        Extract structured information about ${dataType} from the following content.
        Return the result as valid JSON matching the expected structure.
        
        Content:
        ${content.substring(0, 8000)} // Limit content length
        
        Context:
        ${JSON.stringify(context)}
      `;
      
      const response = await this.mcpClient.chat({
        messages: [{ role: 'user', content: prompt }],
        model: 'vertexai/gemini-2.5-flash'
      });
      
      // Extract JSON from response
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        response.content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error extracting structured data', { error, dataType });
      return null;
    }
  }

  /**
   * Create fallback market overview when search fails
   */
  private createFallbackMarketOverview(context: MarketResearchContext): MarketOverview {
    return {
      marketSize: 'Data unavailable',
      growthRate: 'Data unavailable',
      keySegments: ['Data unavailable'],
      majorPlayers: context.competitors || ['Data unavailable'],
      marketDynamics: ['Data unavailable'],
      regulatoryEnvironment: ['Data unavailable']
    };
  }

  /**
   * Create fallback competitor analysis when search fails
   */
  private createFallbackCompetitorAnalysis(competitor: string): CompetitorAnalysis {
    return {
      name: competitor,
      website: `https://${competitor.toLowerCase().replace(/\s+/g, '')}.com`,
      description: 'Data unavailable',
      marketShare: 'Data unavailable',
      strengths: ['Data unavailable'],
      weaknesses: ['Data unavailable'],
      products: [{
        name: 'Data unavailable',
        description: 'Data unavailable',
        features: ['Data unavailable'],
        targetAudience: 'Data unavailable',
        pricing: 'Data unavailable'
      }],
      pricing: [{
        tier: 'Data unavailable',
        price: 'Data unavailable',
        features: ['Data unavailable'],
        targetSegment: 'Data unavailable'
      }],
      marketingStrategy: ['Data unavailable'],
      recentNews: [{
        title: 'Data unavailable',
        date: new Date().toISOString().split('T')[0],
        source: 'Data unavailable',
        summary: 'Data unavailable',
        relevance: 'medium'
      }]
    };
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: SynthesisRequest): string {
    const context = request.context as MarketResearchContext;
    const key = `market-research:${context.industry || ''}:${context.targetMarket || ''}:${
      (context.competitors || []).join(',')
    }:${context.researchDepth || 'basic'}`;
    
    return key;
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(cacheKey: string): boolean {
    if (!this.cache.has(cacheKey)) {
      return false;
    }
    
    const expiry = this.cacheExpiry.get(cacheKey);
    if (!expiry) {
      return false;
    }
    
    // Check if cache entry has expired
    return Date.now() < expiry;
  }

  /**
   * Cache result with expiry
   */
  private cacheResult(cacheKey: string, result: any, expiryMinutes: number = 30): void {
    this.cache.set(cacheKey, result);
    // Set expiry time
    this.cacheExpiry.set(cacheKey, Date.now() + expiryMinutes * 60 * 1000);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Clear caches
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
