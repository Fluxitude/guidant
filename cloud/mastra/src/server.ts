/**
 * Express Server for Strategic Agent Synthesis
 * 
 * Implements API endpoints for synthesis operations, health checks,
 * and administrative functions with proper error handling and logging.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Mastra } from '@mastra/core';
import { Logger } from '@mastra/loggers';
import { AgentSynthesisRouter, SynthesisRequest, SynthesisResponse } from './synthesis/router.js';

// Define server configuration interface
export interface ServerConfig {
  port?: number;
  host?: string;
  corsOrigins?: string[];
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  timeout?: number;
}

/**
 * Create Express server with proper middleware and routes
 */
export function createServer(
  mastra: Mastra,
  config: { server?: ServerConfig },
  synthesisRouter: AgentSynthesisRouter
): express.Application {
  const app = express();
  const serverConfig = config.server || {};
  
  // Get logger from Mastra instance
  const logger = (mastra as any).logger as Logger;
  
  // Configure middleware
  app.use(helmet()); // Security headers
  app.use(compression()); // Compress responses
  app.use(express.json({ limit: '5mb' })); // Parse JSON bodies
  
  // Configure CORS
  const corsOptions = {
    origin: serverConfig.corsOrigins || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
  };
  app.use(cors(corsOptions));
  
  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request processed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`
      });
    });
    
    next();
  });
  
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    const mcpClient = (mastra as any).mcpClient;
    const mcpStatus = mcpClient ? mcpClient.getStatus() : { connected: false };
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      mcp: mcpStatus,
      uptime: process.uptime()
    });
  });
  
  // Synthesis API endpoint
  app.post('/api/synthesis', async (req: Request, res: Response) => {
    try {
      const request: SynthesisRequest = req.body;
      
      // Validate request
      if (!request.operation || !request.tools || !Array.isArray(request.tools)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request format. Required: operation, tools (array)'
        });
      }
      
      // Process synthesis request
      logger.info('Received synthesis request', { 
        operation: request.operation,
        tools: request.tools.length
      });
      
      const response = await synthesisRouter.route(request);
      
      return res.json(response);
      
    } catch (error) {
      logger.error('Error processing synthesis request', { error });
      
      return res.status(500).json({
        success: false,
        error: 'Error processing synthesis request',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Agent capabilities endpoint
  app.get('/api/agents', (req: Request, res: Response) => {
    const agents = mastra.agents || {};
    
    const agentCapabilities = Object.entries(agents).map(([name, agent]) => ({
      name,
      description: (agent as any).description || '',
      capabilities: (agent as any).capabilities || []
    }));
    
    res.json({
      agents: agentCapabilities
    });
  });
  
  // MCP tools endpoint
  app.get('/api/tools', (req: Request, res: Response) => {
    const mcpClient = (mastra as any).mcpClient;
    
    if (!mcpClient) {
      return res.status(503).json({
        success: false,
        error: 'MCP client not available'
      });
    }
    
    mcpClient.getTools()
      .then((tools: any) => {
        const toolsByServer = Object.entries(tools).map(([server, serverTools]) => ({
          server,
          tools: Array.isArray(serverTools) 
            ? serverTools 
            : Object.keys(serverTools as object)
        }));
        
        res.json({
          success: true,
          toolsByServer
        });
      })
      .catch((error: Error) => {
        logger.error('Error fetching MCP tools', { error });
        
        res.status(500).json({
          success: false,
          error: 'Error fetching MCP tools',
          message: error.message
        });
      });
  });
  
  // Performance metrics endpoint
  app.get('/api/metrics', (req: Request, res: Response) => {
    try {
      const performanceStats = synthesisRouter.getPerformanceStats();
      
      res.json({
        success: true,
        metrics: performanceStats
      });
    } catch (error) {
      logger.error('Error fetching performance metrics', { error });
      
      res.status(500).json({
        success: false,
        error: 'Error fetching performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error in request', { error: err });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message
    });
  });
  
  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Not found',
      message: `Route ${req.path} not found`
    });
  });
  
  return app;
} 