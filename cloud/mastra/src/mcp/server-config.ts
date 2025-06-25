/**
 * MCP Server Configuration for Strategic Agent Synthesis
 * 
 * Configures connections to Context7, Tavily, Firecrawl, and Stagehand MCP servers
 * with proper authentication, timeouts, and error handling.
 */

import { MCPServerConfig } from '@mastra/mcp';

/**
 * Create comprehensive MCP server configuration
 */
export function createMCPServerConfig(): Record<string, MCPServerConfig> {
  return {
    // Context7 - Up-to-date code documentation and library examples
    context7: {
      command: 'npx',
      args: ['-y', '--package=@context7/mcp-server', 'context7-mcp-server'],
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        // Context7 doesn't require API keys - uses public documentation
      },
      timeout: 30000,
      enableServerLogs: process.env.NODE_ENV === 'development',
      retryAttempts: 3,
      retryDelay: 1000
    },

    // Tavily - AI-tailored search engine with real-time web search
    tavily: {
      command: 'npx',
      args: ['-y', '--package=@tavily/mcp-server', 'tavily-mcp-server'],
      env: {
        TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
        NODE_ENV: process.env.NODE_ENV || 'development'
      },
      timeout: 45000, // Search operations may take longer
      enableServerLogs: process.env.NODE_ENV === 'development',
      retryAttempts: 2,
      retryDelay: 2000,
      healthCheck: {
        enabled: true,
        interval: 60000, // Check every minute
        timeout: 10000
      }
    },

    // Firecrawl - Web scraping and crawling with LLM-powered extraction
    firecrawl: {
      command: 'npx',
      args: ['-y', '--package=@firecrawl/mcp-server', 'firecrawl-mcp-server'],
      env: {
        FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || '',
        NODE_ENV: process.env.NODE_ENV || 'development'
      },
      timeout: 120000, // Web crawling can take significant time
      enableServerLogs: process.env.NODE_ENV === 'development',
      retryAttempts: 2,
      retryDelay: 3000,
      healthCheck: {
        enabled: true,
        interval: 120000, // Check every 2 minutes
        timeout: 15000
      }
    },

    // Stagehand - Browser automation with AI-powered web interaction
    stagehand: {
      command: 'npx',
      args: ['-y', '--package=@stagehand/mcp-server', 'stagehand-mcp-server'],
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        // Stagehand may require browser configuration
        STAGEHAND_BROWSER_PATH: process.env.STAGEHAND_BROWSER_PATH,
        STAGEHAND_HEADLESS: process.env.STAGEHAND_HEADLESS || 'true'
      },
      timeout: 180000, // Browser automation can be very slow
      enableServerLogs: process.env.NODE_ENV === 'development',
      retryAttempts: 1, // Browser processes are sensitive to retries
      retryDelay: 5000,
      healthCheck: {
        enabled: true,
        interval: 180000, // Check every 3 minutes
        timeout: 30000
      }
    }
  };
}

/**
 * Validate MCP server environment variables
 */
export function validateMCPEnvironment(): {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
} {
  const missingVars: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const requiredVars = [
    'TAVILY_API_KEY',
    'FIRECRAWL_API_KEY'
  ];

  // Optional but recommended environment variables
  const optionalVars = [
    'STAGEHAND_BROWSER_PATH',
    'STAGEHAND_HEADLESS'
  ];

  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  // Check optional variables
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      warnings.push(`Optional environment variable ${varName} not set - using defaults`);
    }
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
    warnings
  };
}

/**
 * Get MCP server capabilities mapping
 */
export function getMCPServerCapabilities(): Record<string, string[]> {
  return {
    context7: [
      'resolve-library-id',
      'get-library-docs'
    ],
    tavily: [
      'tavily-search',
      'tavily-extract'
    ],
    firecrawl: [
      'firecrawl_scrape',
      'firecrawl_map',
      'firecrawl_crawl',
      'firecrawl_search',
      'firecrawl_extract',
      'firecrawl_deep_research'
    ],
    stagehand: [
      'browser_navigate',
      'browser_click',
      'browser_type',
      'browser_snapshot',
      'browser_extract'
    ]
  };
}

/**
 * Tool categorization for agent synthesis routing
 */
export interface ToolCategory {
  name: string;
  description: string;
  complexity: 'simple' | 'complex';
  servers: string[];
  tools: string[];
}

/**
 * Get tool categorization for synthesis routing
 */
export function getToolCategories(): ToolCategory[] {
  return [
    {
      name: 'technical-documentation',
      description: 'Technical documentation and library research',
      complexity: 'complex',
      servers: ['context7'],
      tools: ['resolve-library-id', 'get-library-docs']
    },
    {
      name: 'web-search',
      description: 'Real-time web search and information gathering',
      complexity: 'complex',
      servers: ['tavily'],
      tools: ['tavily-search', 'tavily-extract']
    },
    {
      name: 'web-scraping',
      description: 'Web scraping and content extraction',
      complexity: 'complex',
      servers: ['firecrawl'],
      tools: ['firecrawl_scrape', 'firecrawl_map', 'firecrawl_crawl', 'firecrawl_search', 'firecrawl_extract']
    },
    {
      name: 'deep-research',
      description: 'Comprehensive research with multiple sources',
      complexity: 'complex',
      servers: ['firecrawl', 'tavily'],
      tools: ['firecrawl_deep_research', 'tavily-search']
    },
    {
      name: 'browser-automation',
      description: 'Browser automation and UI interaction',
      complexity: 'complex',
      servers: ['stagehand'],
      tools: ['browser_navigate', 'browser_click', 'browser_type', 'browser_snapshot', 'browser_extract']
    }
  ];
}
