/**
 * Agent Synthesis Router
 * 
 * Implements intelligent routing logic to determine whether operations should
 * use agent synthesis (complex operations) or direct tool calls (simple operations).
 * Routes complex research tasks to specialized synthesis agents.
 */

import { Logger } from '@mastra/loggers';
import { getToolCategories, ToolCategory } from '../mcp/server-config.js';
import type { TechnicalResearchAgent } from '../agents/technical-research.js';
import type { MarketResearchAgent } from '../agents/market-research.js';
import type { UIUXResearchAgent } from '../agents/uiux-research.js';
import type { GeneralResearchAgent } from '../agents/general-research.js';
import { RedisStateManager } from '../utils/redis-client.js';
import { createRedisConfig, Config } from '../utils/config.js';
import crypto from 'crypto';

export interface SynthesisAgents {
  technicalAgent: TechnicalResearchAgent;
  marketAgent: MarketResearchAgent;
  uiuxAgent: UIUXResearchAgent;
  generalAgent: GeneralResearchAgent;
}

export interface RoutingDecision {
  useAgentSynthesis: boolean;
  agent?: keyof SynthesisAgents;
  reasoning: string;
  toolCategory?: ToolCategory;
  estimatedComplexity: number; // 1-10 scale
}

export interface SynthesisRequest {
  operation: string;
  context: Record<string, any>;
  tools: string[];
  parameters: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
}

export interface SynthesisResponse {
  success: boolean;
  data: any;
  metadata: {
    agent?: string;
    toolsUsed: string[];
    executionTime: number;
    complexity: number;
    cacheHit?: boolean;
  };
  error?: string;
}

/**
 * Agent Synthesis Router - Core routing logic for strategic synthesis
 */
export class AgentSynthesisRouter {
  private agents: SynthesisAgents;
  private logger: Logger;
  private toolCategories: ToolCategory[];
  private mcpTools: Record<string, any> = {};
  private routingCache = new Map<string, RoutingDecision>();
  private performanceMetrics = new Map<string, number[]>();
  private redisManager: RedisStateManager | null = null;

  constructor(agents: SynthesisAgents, logger: Logger, config?: Config) {
    this.agents = agents;
    this.logger = logger;
    this.toolCategories = getToolCategories();
    
    // Initialize Redis if configured
    if (config?.redis) {
      this.redisManager = new RedisStateManager(createRedisConfig(config), logger);
      this.initializeRedis();
    }
  }
  
  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    if (this.redisManager) {
      try {
        const initialized = await this.redisManager.initialize();
        if (initialized) {
          this.logger.info('Redis state management initialized for router');
        } else {
          this.logger.warn('Redis initialization failed, using in-memory cache only');
        }
      } catch (error) {
        this.logger.error('Error initializing Redis', { error });
      }
    }
  }

  /**
   * Initialize router with available MCP tools
   */
  async initialize(mcpTools: Record<string, any>): Promise<void> {
    this.mcpTools = mcpTools;
    this.logger.info('Agent Synthesis Router initialized', {
      availableTools: Object.keys(mcpTools).length,
      toolCategories: this.toolCategories.length,
      agents: Object.keys(this.agents),
      redisEnabled: !!this.redisManager
    });
  }

  /**
   * Route a synthesis request to appropriate handler
   */
  async route(request: SynthesisRequest): Promise<SynthesisResponse> {
    const startTime = Date.now();
    
    try {
      // Step 1: Make routing decision
      const decision = await this.makeRoutingDecision(request);
      
      this.logger.info('Routing decision made', {
        operation: request.operation,
        useAgentSynthesis: decision.useAgentSynthesis,
        agent: decision.agent,
        complexity: decision.estimatedComplexity,
        reasoning: decision.reasoning
      });

      // Step 2: Execute based on routing decision
      let response: SynthesisResponse;
      
      if (decision.useAgentSynthesis && decision.agent) {
        response = await this.executeAgentSynthesis(request, decision);
      } else {
        response = await this.executeDirectToolCall(request, decision);
      }

      // Step 3: Record performance metrics
      const executionTime = Date.now() - startTime;
      this.recordPerformanceMetrics(request.operation, executionTime, decision.estimatedComplexity);

      response.metadata.executionTime = executionTime;
      response.metadata.complexity = decision.estimatedComplexity;

      return response;

    } catch (error) {
      this.logger.error('Error in synthesis routing', { error, request });
      
      return {
        success: false,
        data: null,
        metadata: {
          toolsUsed: [],
          executionTime: Date.now() - startTime,
          complexity: 0
        },
        error: error instanceof Error ? error.message : 'Unknown routing error'
      };
    }
  }

  /**
   * Make intelligent routing decision
   */
  private async makeRoutingDecision(request: SynthesisRequest): Promise<RoutingDecision> {
    const cacheKey = this.generateCacheKey(request);
    
    // Check in-memory cache first
    if (this.routingCache.has(cacheKey)) {
      const cached = this.routingCache.get(cacheKey)!;
      this.logger.debug('Using cached routing decision from memory', { cacheKey });
      return cached;
    }
    
    // Check Redis cache if available
    if (this.redisManager?.isReady()) {
      try {
        const cachedDecision = await this.redisManager.getRoutingDecision<RoutingDecision>(cacheKey);
        if (cachedDecision) {
          this.logger.debug('Using cached routing decision from Redis', { cacheKey });
          // Update in-memory cache
          this.routingCache.set(cacheKey, cachedDecision);
          return cachedDecision;
        }
      } catch (error) {
        this.logger.warn('Error retrieving routing decision from Redis', { error, cacheKey });
      }
    }

    // Analyze request complexity
    const complexity = this.analyzeComplexity(request);
    
    // Find matching tool category
    const toolCategory = this.findToolCategory(request.tools);
    
    // Determine if agent synthesis is needed
    const useAgentSynthesis = this.shouldUseAgentSynthesis(request, complexity, toolCategory);
    
    // Select appropriate agent if using synthesis
    const agent = useAgentSynthesis ? this.selectAgent(request, toolCategory) : undefined;
    
    const decision: RoutingDecision = {
      useAgentSynthesis,
      agent,
      reasoning: this.generateReasoning(request, complexity, toolCategory, useAgentSynthesis),
      toolCategory,
      estimatedComplexity: complexity
    };

    // Cache the decision in memory
    this.routingCache.set(cacheKey, decision);
    
    // Cache in Redis if available
    if (this.redisManager?.isReady()) {
      try {
        await this.redisManager.storeRoutingDecision(cacheKey, decision);
      } catch (error) {
        this.logger.warn('Error storing routing decision in Redis', { error, cacheKey });
      }
    }
    
    return decision;
  }

  /**
   * Analyze request complexity (1-10 scale)
   */
  private analyzeComplexity(request: SynthesisRequest): number {
    let complexity = 1;

    // Factor 1: Number of tools required
    complexity += Math.min(request.tools.length * 0.5, 3);

    // Factor 2: Context complexity
    const contextKeys = Object.keys(request.context);
    complexity += Math.min(contextKeys.length * 0.2, 2);

    // Factor 3: Operation type complexity
    const complexOperations = [
      'research', 'analyze', 'compare', 'synthesize', 'evaluate',
      'crawl', 'extract', 'automate', 'navigate'
    ];
    
    if (complexOperations.some(op => request.operation.toLowerCase().includes(op))) {
      complexity += 2;
    }

    // Factor 4: Parameter complexity
    const paramCount = Object.keys(request.parameters).length;
    complexity += Math.min(paramCount * 0.1, 1);

    // Factor 5: Priority boost
    if (request.priority === 'high') {
      complexity += 1;
    }

    return Math.min(Math.round(complexity), 10);
  }

  /**
   * Find matching tool category
   */
  private findToolCategory(tools: string[]): ToolCategory | undefined {
    return this.toolCategories.find(category => 
      tools.some(tool => category.tools.includes(tool))
    );
  }

  /**
   * Determine if agent synthesis should be used
   */
  private shouldUseAgentSynthesis(
    request: SynthesisRequest, 
    complexity: number, 
    toolCategory?: ToolCategory
  ): boolean {
    // Use agent synthesis for complex operations (complexity >= 5)
    if (complexity >= 5) return true;
    
    // Use agent synthesis for complex tool categories
    if (toolCategory?.complexity === 'complex') return true;
    
    // Use agent synthesis for multi-tool operations
    if (request.tools.length > 2) return true;
    
    // Use agent synthesis for research operations
    if (request.operation.toLowerCase().includes('research')) return true;
    
    return false;
  }

  /**
   * Select appropriate agent for synthesis
   */
  private selectAgent(request: SynthesisRequest, toolCategory?: ToolCategory): keyof SynthesisAgents {
    // Route based on tool category
    if (toolCategory) {
      switch (toolCategory.name) {
        case 'technical-documentation':
        case 'web-scraping':
          return 'technicalAgent';
        case 'web-search':
        case 'deep-research':
          return 'marketAgent'; // Market research often involves web search
        case 'browser-automation':
          return 'uiuxAgent'; // UI/UX research often involves browser automation
      }
    }

    // Route based on operation keywords
    const operation = request.operation.toLowerCase();
    
    if (operation.includes('technical') || operation.includes('code') || operation.includes('library')) {
      return 'technicalAgent';
    }
    
    if (operation.includes('market') || operation.includes('competitor') || operation.includes('business')) {
      return 'marketAgent';
    }
    
    if (operation.includes('ui') || operation.includes('ux') || operation.includes('design') || operation.includes('user')) {
      return 'uiuxAgent';
    }

    // Default to general research agent
    return 'generalAgent';
  }

  /**
   * Execute agent synthesis
   */
  private async executeAgentSynthesis(
    request: SynthesisRequest, 
    decision: RoutingDecision
  ): Promise<SynthesisResponse> {
    const agent = this.agents[decision.agent!];
    
    try {
      const result = await agent.synthesize(request);
      
      return {
        success: true,
        data: result,
        metadata: {
          agent: decision.agent,
          toolsUsed: request.tools,
          executionTime: 0, // Will be set by caller
          complexity: decision.estimatedComplexity
        }
      };
    } catch (error) {
      this.logger.error('Agent synthesis failed', { error, agent: decision.agent });
      throw error;
    }
  }

  /**
   * Execute direct tool call (fallback for simple operations)
   */
  private async executeDirectToolCall(
    request: SynthesisRequest, 
    decision: RoutingDecision
  ): Promise<SynthesisResponse> {
    // For now, return a placeholder - this would integrate with direct MCP tool calls
    this.logger.info('Executing direct tool call', { tools: request.tools });
    
    return {
      success: true,
      data: { message: 'Direct tool call executed', operation: request.operation },
      metadata: {
        toolsUsed: request.tools,
        executionTime: 0, // Will be set by caller
        complexity: decision.estimatedComplexity
      }
    };
  }

  /**
   * Generate cache key for routing decisions
   */
  private generateCacheKey(request: SynthesisRequest): string {
    // Create a deterministic hash of the request
    const requestData = JSON.stringify({
      operation: request.operation,
      tools: request.tools.sort(),
      context: this.sortObjectKeys(request.context),
      parameters: this.sortObjectKeys(request.parameters)
    });
    
    return crypto.createHash('md5').update(requestData).digest('hex');
  }

  /**
   * Sort object keys for deterministic JSON stringification
   */
  private sortObjectKeys(obj: Record<string, any>): Record<string, any> {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    return Object.keys(obj).sort().reduce((result, key) => {
      result[key] = this.sortObjectKeys(obj[key]);
      return result;
    }, {} as Record<string, any>);
  }

  /**
   * Generate human-readable reasoning for routing decision
   */
  private generateReasoning(
    request: SynthesisRequest,
    complexity: number,
    toolCategory?: ToolCategory,
    useAgentSynthesis?: boolean
  ): string {
    const reasons = [];
    
    if (complexity >= 5) {
      reasons.push(`High complexity score (${complexity}/10)`);
    }
    
    if (toolCategory?.complexity === 'complex') {
      reasons.push(`Complex tool category: ${toolCategory.name}`);
    }
    
    if (request.tools.length > 2) {
      reasons.push(`Multiple tools required (${request.tools.length})`);
    }
    
    if (request.operation.toLowerCase().includes('research')) {
      reasons.push('Research operation detected');
    }

    const action = useAgentSynthesis ? 'Using agent synthesis' : 'Using direct tool calls';
    return `${action}: ${reasons.join(', ') || 'Simple operation'}`;
  }

  /**
   * Record performance metrics for optimization
   */
  private recordPerformanceMetrics(operation: string, executionTime: number, complexity: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    
    const metrics = this.performanceMetrics.get(operation)!;
    metrics.push(executionTime);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [operation, times] of this.performanceMetrics.entries()) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      stats[operation] = {
        averageTime: Math.round(avg),
        minTime: min,
        maxTime: max,
        sampleCount: times.length
      };
    }
    
    return stats;
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Close Redis connection if available
    if (this.redisManager) {
      await this.redisManager.close();
    }
    
    // Clear caches
    this.routingCache.clear();
    this.performanceMetrics.clear();
  }
}
