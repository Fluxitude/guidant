import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from './server';
import type { AgentSynthesisRouter } from './synthesis/router';

// Mock dependencies
vi.mock('./synthesis/router', () => ({
  AgentSynthesisRouter: vi.fn().mockImplementation(() => ({
    route: vi.fn().mockImplementation(async (req) => {
      if (req.operation.includes('error')) {
        throw new Error('Test error');
      }
      return { 
        success: true,
        data: { result: 'Mocked result' },
        metadata: {
          toolsUsed: req.tools,
          executionTime: 100,
          complexity: 5
        }
      };
    }),
    getPerformanceStats: vi.fn().mockReturnValue({
      operations: 10,
      averageTime: 150,
      complexityDistribution: { low: 4, medium: 3, high: 3 }
    })
  })),
}));

// Mock Mastra
const mockMastra = {
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  },
  mcpClient: {
    getStatus: vi.fn().mockReturnValue({ connected: true }),
    getTools: vi.fn().mockResolvedValue({
      guidant: ['research_guidant', 'get_tasks_guidant']
    })
  },
  agents: {
    technicalAgent: { description: 'Technical research', capabilities: ['library_docs'] },
    marketAgent: { description: 'Market research', capabilities: ['competitor_analysis'] }
  }
};

// Mock config
const mockConfig = {
  server: {
    port: 3000,
    corsOrigins: ['*'],
    timeout: 30000
  }
};

// Mock router
const mockRouter = {} as AgentSynthesisRouter;

describe('Express Server', () => {
  let app: any;

  beforeEach(() => {
    app = createServer(mockMastra as any, mockConfig, mockRouter);
  });

  describe('GET /health', () => {
    it('should return 200 OK with status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('mcp.connected', true);
    });
  });

  describe('GET /api/agents', () => {
    it('should return 200 OK with agent capabilities', async () => {
      const response = await request(app).get('/api/agents');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('agents');
      expect(response.body.agents).toHaveLength(2);
    });
  });

  describe('GET /api/metrics', () => {
    it('should return 200 OK with performance metrics', async () => {
      // Mock the getPerformanceStats method
      mockRouter.getPerformanceStats = vi.fn().mockReturnValue({
        operations: 10,
        averageTime: 150
      });
      
      const response = await request(app).get('/api/metrics');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('metrics');
    });
  });

  describe('POST /api/synthesis', () => {
    it('should return 200 OK with synthesis results', async () => {
      // Mock the route method
      mockRouter.route = vi.fn().mockResolvedValue({
        success: true,
        data: { result: 'Synthesis result' },
        metadata: {
          toolsUsed: ['research_guidant'],
          executionTime: 100,
          complexity: 7
        }
      });
      
      const response = await request(app)
        .post('/api/synthesis')
        .send({
          operation: 'research',
          tools: ['research_guidant'],
          context: { projectType: 'web' },
          parameters: { query: 'What are the best React state management libraries?' }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(mockRouter.route).toHaveBeenCalled();
    });

    it('should return 400 Bad Request if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/synthesis')
        .send({
          context: { projectType: 'web' }
        });
      
      expect(response.status).toBe(400);
    });

    it('should return 500 Internal Server Error on failure', async () => {
      // Mock the route method to throw an error
      mockRouter.route = vi.fn().mockRejectedValue(new Error('Test error'));
      
      const response = await request(app)
        .post('/api/synthesis')
        .send({
          operation: 'error_operation',
          tools: ['research_guidant'],
          context: {},
          parameters: {}
        });
      
      expect(response.status).toBe(500);
    });
  });
}); 