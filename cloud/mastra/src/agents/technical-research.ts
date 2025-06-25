/**
 * Technical Research Agent
 * 
 * Specializes in technical documentation research, library analysis,
 * and code-related investigations using Context7 and other technical resources.
 */

import { Agent } from '@mastra/core/agent';
import type { Logger } from '@mastra/loggers';
import { MCPClient } from '@mastra/mcp';
import { vertexai } from '@ai-sdk/vertexai';
import { SynthesisRequest, SynthesisResponse } from '../synthesis/router.js';

export interface TechnicalResearchContext {
  libraries?: string[];
  technologies?: string[];
  frameworks?: string[];
  programmingLanguages?: string[];
  architecturePatterns?: string[];
  codeExamples?: boolean;
  documentationDepth?: 'basic' | 'detailed' | 'comprehensive';
}

export interface TechnicalResearchResult {
  libraries: LibraryAnalysis[];
  codeExamples: CodeExample[];
  bestPractices: string[];
  architectureRecommendations: ArchitectureRecommendation[];
  compatibilityMatrix: CompatibilityInfo[];
  implementationGuide: ImplementationStep[];
  sources: string[];
}

export interface LibraryAnalysis {
  name: string;
  version: string;
  description: string;
  features: string[];
  pros: string[];
  cons: string[];
  useCases: string[];
  documentation: string;
  examples: CodeExample[];
  popularity: number;
  maintenance: 'active' | 'maintained' | 'deprecated';
}

export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: string;
  framework?: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface ArchitectureRecommendation {
  pattern: string;
  description: string;
  benefits: string[];
  tradeoffs: string[];
  applicability: string[];
  implementation: string;
}

export interface CompatibilityInfo {
  library1: string;
  library2: string;
  compatible: boolean;
  notes: string;
  alternativeApproach?: string;
}

export interface ImplementationStep {
  step: number;
  title: string;
  description: string;
  code?: string;
  dependencies?: string[];
  estimatedTime: string;
}

/**
 * Technical Research Agent - Specialized for technical documentation and analysis
 */
export class TechnicalResearchAgent extends Agent {
  protected logger: Logger;
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();

  constructor(mcpClient: MCPClient, logger: Logger) {
    const options = {
      name: 'TechnicalResearchAgent',
      description: 'Specialized agent for technical documentation research and library analysis',
      instructions: `
        You are a technical research specialist focused on:
        1. Library and framework analysis using Context7 documentation
        2. Code example generation and best practices
        3. Architecture pattern recommendations
        4. Compatibility analysis between technologies
        5. Implementation guidance and step-by-step instructions
        
        Always provide practical, actionable insights with code examples.
        Prioritize current, well-maintained libraries and proven patterns.
        Include compatibility considerations and migration paths.
      `,
      model: vertexai("gemini-2.5-pro"),
      tools: mcpClient.getToolsets ? mcpClient.getToolsets() : {},
    };
    
    super(options);
    
    this.logger = logger;
  }

  /**
   * Synthesize technical research request
   */
  async synthesize(request: SynthesisRequest): Promise<TechnicalResearchResult> {
    this.logger.info('Starting technical research synthesis', { 
      operation: request.operation,
      tools: request.tools 
    });

    const context = request.context as TechnicalResearchContext;
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      this.logger.info('Returning cached technical research result');
      return this.cache.get(cacheKey);
    }

    try {
      const result: TechnicalResearchResult = {
        libraries: [],
        codeExamples: [],
        bestPractices: [],
        architectureRecommendations: [],
        compatibilityMatrix: [],
        implementationGuide: [],
        sources: []
      };

      // Generate a prompt based on the request
      const prompt = this.createResearchPrompt(request);
      
      // Use the Agent's generate method to perform the research
      const response = await this.generate(
        [{ role: "user", content: prompt }],
        {
          maxSteps: 15, // Allow multiple tool calls
          onStepFinish: ({ text, toolCalls }) => {
            this.logger.debug('Research step completed', { 
              textLength: text?.length || 0,
              toolCalls: toolCalls?.length || 0
            });
          }
        }
      );

      // Process the response into our result structure
      const processedResult = this.processAgentResponse(response.text, context);
      Object.assign(result, processedResult);

      // Cache the result
      this.cacheResult(cacheKey, result);

      this.logger.info('Technical research synthesis completed', {
        librariesAnalyzed: result.libraries.length,
        codeExamples: result.codeExamples.length,
        architectureRecommendations: result.architectureRecommendations.length
      });

      return result;

    } catch (error) {
      this.logger.error('Error in technical research synthesis', { error });
      throw error;
    }
  }

  /**
   * Create a research prompt based on the request
   */
  private createResearchPrompt(request: SynthesisRequest): string {
    const context = request.context as TechnicalResearchContext;
    
    let prompt = `Perform technical research on the following:\n\n`;
    
    if (context.libraries?.length) {
      prompt += `Libraries to research: ${context.libraries.join(', ')}\n`;
    }
    
    if (context.technologies?.length) {
      prompt += `Technologies to research: ${context.technologies.join(', ')}\n`;
    }
    
    if (context.frameworks?.length) {
      prompt += `Frameworks to research: ${context.frameworks.join(', ')}\n`;
    }
    
    if (context.programmingLanguages?.length) {
      prompt += `Programming languages: ${context.programmingLanguages.join(', ')}\n`;
    }
    
    if (context.architecturePatterns?.length) {
      prompt += `Architecture patterns to analyze: ${context.architecturePatterns.join(', ')}\n`;
    }
    
    prompt += `\nDocumentation depth: ${context.documentationDepth || 'detailed'}\n`;
    prompt += context.codeExamples ? 'Include code examples.\n' : '';
    
    prompt += `\nOperation: ${request.operation}\n`;
    
    prompt += `\nProvide a comprehensive technical analysis including:
1. Library/framework details and features
2. Code examples and best practices
3. Architecture recommendations
4. Compatibility information
5. Implementation guidance

Format your response as structured data that can be parsed into sections for each of these areas.`;
    
    return prompt;
  }

  /**
   * Process the agent's response text into our result structure
   */
  private processAgentResponse(responseText: string, context: TechnicalResearchContext): Partial<TechnicalResearchResult> {
    // This is a simplified implementation - in a real system, you would
    // implement proper parsing of the response into structured data
    
    const result: Partial<TechnicalResearchResult> = {
      libraries: [],
      codeExamples: [],
      bestPractices: [],
      architectureRecommendations: [],
      compatibilityMatrix: [],
      implementationGuide: [],
      sources: []
    };
    
    // Extract libraries section
    if (context.libraries?.length) {
      for (const library of context.libraries) {
        result.libraries?.push(this.createLibraryAnalysisFromText(library, responseText));
      }
    }
    
    // Extract code examples
    const codeBlocks = responseText.match(/```[\s\S]+?```/g) || [];
    result.codeExamples = codeBlocks.map((block, index) => {
      const language = block.match(/```(\w+)/)?.[1] || 'text';
      const code = block.replace(/```\w*\n/, '').replace(/```$/, '');
      
      return {
        title: `Example ${index + 1}`,
        description: `Code example extracted from research`,
        code,
        language,
        complexity: 'intermediate',
        tags: context.libraries || []
      };
    });
    
    // Extract best practices
    const bestPracticesMatch = responseText.match(/Best Practices:[\s\S]+?(?=\n#|\n##|$)/i);
    if (bestPracticesMatch) {
      result.bestPractices = bestPracticesMatch[0]
        .replace(/Best Practices:[\s\n]*/i, '')
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.replace(/^[*-]\s*/, '').trim());
    }
    
    // Extract sources
    const sourcesMatch = responseText.match(/Sources:[\s\S]+?(?=\n#|\n##|$)/i);
    if (sourcesMatch) {
      result.sources = sourcesMatch[0]
        .replace(/Sources:[\s\n]*/i, '')
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.trim());
    }
    
    return result;
  }

  /**
   * Create a library analysis from text
   */
  private createLibraryAnalysisFromText(libraryName: string, text: string): LibraryAnalysis {
    // Extract library section
    const libraryRegex = new RegExp(`${libraryName}[\\s\\S]+?(?=\\n#|\\n##|$)`, 'i');
    const libraryMatch = text.match(libraryRegex);
    const libraryText = libraryMatch ? libraryMatch[0] : '';
    
    return {
      name: libraryName,
      version: this.extractVersion(libraryText),
      description: this.extractDescription(libraryText),
      features: this.extractListItems(libraryText, 'Features'),
      pros: this.extractListItems(libraryText, 'Pros'),
      cons: this.extractListItems(libraryText, 'Cons'),
      useCases: this.extractListItems(libraryText, 'Use Cases'),
      documentation: this.extractDocumentationLink(libraryText),
      examples: [],
      popularity: this.estimatePopularity(libraryText),
      maintenance: this.estimateMaintenanceStatus(libraryText)
    };
  }

  /**
   * Extract version from text
   */
  private extractVersion(text: string): string {
    const versionMatch = text.match(/version:?\s*([\d\.]+)/i);
    return versionMatch ? versionMatch[1] : 'latest';
  }

  /**
   * Extract description from text
   */
  private extractDescription(text: string): string {
    const descriptionMatch = text.match(/description:?\s*([^\n]+)/i);
    return descriptionMatch ? descriptionMatch[1].trim() : '';
  }

  /**
   * Extract list items from text
   */
  private extractListItems(text: string, section: string): string[] {
    const sectionRegex = new RegExp(`${section}:?[\\s\\S]+?(?=\\n#|\\n##|\\n\\w+:|$)`, 'i');
    const sectionMatch = text.match(sectionRegex);
    
    if (!sectionMatch) return [];
    
    return sectionMatch[0]
      .replace(new RegExp(`${section}:?\\s*`, 'i'), '')
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[*-]\s*/, '').trim());
  }

  /**
   * Extract documentation link from text
   */
  private extractDocumentationLink(text: string): string {
    const docMatch = text.match(/documentation:?\s*(https?:\/\/[^\s]+)/i);
    return docMatch ? docMatch[1] : '';
  }

  /**
   * Estimate popularity from text
   */
  private estimatePopularity(text: string): number {
    const popularityMatch = text.match(/popularity:?\s*(\d+)/i);
    return popularityMatch ? parseInt(popularityMatch[1], 10) : 5;
  }

  /**
   * Estimate maintenance status from text
   */
  private estimateMaintenanceStatus(text: string): 'active' | 'maintained' | 'deprecated' {
    if (text.match(/deprecated|no longer maintained|abandoned/i)) {
      return 'deprecated';
    }
    
    if (text.match(/actively developed|active development|frequent updates/i)) {
      return 'active';
    }
    
    return 'maintained';
  }

  /**
   * Generate cache key for a request
   */
  private generateCacheKey(request: SynthesisRequest): string {
    const { operation, context, tools } = request;
    const key = JSON.stringify({ operation, context, tools });
    return `technical-research:${key}`;
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

    // Check if cache entry has expired (default TTL: 1 hour)
    return Date.now() < expiry;
  }

  /**
   * Cache a result with TTL
   */
  private cacheResult(cacheKey: string, result: any, ttlMs = 3600000): void {
    this.cache.set(cacheKey, result);
    this.cacheExpiry.set(cacheKey, Date.now() + ttlMs);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
