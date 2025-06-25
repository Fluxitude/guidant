/**
 * Guidant Strategic Agent Synthesis Architecture
 * 
 * Implements selective agent synthesis for complex operations while preserving
 * direct calls for simple operations. Integrates multiple MCP servers for
 * comprehensive research and analysis capabilities.
 */

import { Agent } from '@mastra/core/agent';
import { createLogger, Logger } from '@mastra/loggers';
import { MCPClient, MCPServerConfig } from '@mastra/mcp';
import { createServer } from './server.js';
import { AgentSynthesisRouter } from './synthesis/router.js';
import { TechnicalResearchAgent } from './agents/technical-research.js';
import { MarketResearchAgent } from './agents/market-research.js';
import { UIUXResearchAgent } from './agents/uiux-research.js';
import { GeneralResearchAgent } from './agents/general-research.js';
import { loadConfig, Config } from './utils/config.js';
import { createMCPServerConfig } from './mcp/server-config.js';
import { RedisStateManager } from './utils/redis-client.js';

/**
 * Main application entry point
 */
async function main() {
  try {
    // Initialize logger
    const logger = createLogger({
      name: 'guidant-synthesis',
      level: process.env.LOG_LEVEL || 'info'
    });
    
    logger.info('Starting Guidant Strategic Agent Synthesis Architecture');
    
    // Load configuration
    const config = loadConfig();
    
    // Initialize MCP client
    const mcpConfig = createMCPServerConfig();
    const mcpClient = new MCPClient({
      servers: mcpConfig,
      timeout: config.mcp?.timeout || 30000
    });
    
    // Initialize Redis state manager if configured
    let redisManager: RedisStateManager | null = null;
    if (config.redis?.enabled) {
      redisManager = new RedisStateManager(config.redis, logger);
      await redisManager.initialize();
    }
    
    // Initialize specialized agents
    const technicalAgent = new TechnicalResearchAgent(mcpClient, logger);
    const marketAgent = new MarketResearchAgent(mcpClient, logger);
    const uiuxAgent = new UIUXResearchAgent(mcpClient, logger);
    const generalAgent = new GeneralResearchAgent(mcpClient, logger);
    
    // Initialize synthesis router
    const router = new AgentSynthesisRouter(
      { technicalAgent, marketAgent, uiuxAgent, generalAgent },
      logger,
      config
    );
    
    // Get available MCP tools
    const mcpTools = await mcpClient.getTools();
    await router.initialize(mcpTools);
    
    // Start HTTP server
    const server = createServer(router, logger, config);
    const port = process.env.PORT || 8080;
    server.listen(port, () => {
      logger.info(`Guidant Synthesis server listening on port ${port}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close();
      await mcpClient.disconnect();
      if (redisManager) {
        await redisManager.close();
      }
      await router.cleanup();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Fatal error starting application:', error);
    process.exit(1);
  }
}

// Start application
main().catch(error => {
  console.error('Unhandled error in main application:', error);
  process.exit(1);
});
