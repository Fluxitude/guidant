import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSynthesisRouter } from './router';

// Mock dependencies
vi.mock('@mastra/loggers', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('../mcp/server-config.js', () => ({
  getToolCategories: vi.fn().mockReturnValue([
    { name: 'research', complexity: 'high', tools: ['research_guidant'] },
    { name: 'task', complexity: 'low', tools: ['get_tasks_guidant'] },
  ]),
}));

describe('AgentSynthesisRouter', () => {
  let router: AgentSynthesisRouter;
  const mockAgents = {
    technicalAgent: {
      execute: vi.fn().mockResolvedValue({ result: 'Technical agent result' }),
    },
    marketAgent: {
      execute: vi.fn().mockResolvedValue({ result: 'Market agent result' }),
    },
    uiuxAgent: {
      execute: vi.fn().mockResolvedValue({ result: 'UI/UX agent result' }),
    },
    generalAgent: {
      execute: vi.fn().mockResolvedValue({ result: 'General agent result' }),
    },
  };
  
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  beforeEach(() => {
    router = new AgentSynthesisRouter(mockAgents as any, mockLogger as any);
    // Mock internal methods
    router['executeAgentSynthesis'] = vi.fn().mockResolvedValue({
      success: true,
      data: { result: 'Agent synthesis result' },
      metadata: {
        toolsUsed: ['research_guidant'],
        executionTime: 100,
        complexity: 7,
        agent: 'technicalAgent'
      }
    });
    router['executeDirectToolCall'] = vi.fn().mockResolvedValue({
      success: true,
      data: { tasks: [] },
      metadata: {
        toolsUsed: ['get_tasks_guidant'],
        executionTime: 50,
        complexity: 2
      }
    });
    router['makeRoutingDecision'] = vi.fn().mockImplementation((request) => {
      const isResearch = request.operation.includes('research');
      return Promise.resolve({
        useAgentSynthesis: isResearch,
        agent: isResearch ? 'technicalAgent' : undefined,
        reasoning: isResearch ? 'Complex research operation' : 'Simple operation',
        toolCategory: isResearch ? { name: 'research', complexity: 'high', tools: ['research_guidant'] } : undefined,
        estimatedComplexity: isResearch ? 7 : 2
      });
    });
    
    router.initialize({
      research_guidant: vi.fn(),
      get_tasks_guidant: vi.fn(),
    });
  });

  describe('route', () => {
    it('should route complex research requests to agent synthesis', async () => {
      const request = {
        operation: 'research',
        context: { projectType: 'web' },
        tools: ['research_guidant'],
        parameters: { query: 'What are the best React state management libraries?' },
      };

      const result = await router.route(request);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('metadata.complexity');
      expect(router['executeAgentSynthesis']).toHaveBeenCalled();
    });

    it('should route simple operations to direct tool calls', async () => {
      const request = {
        operation: 'get_tasks',
        context: {},
        tools: ['get_tasks_guidant'],
        parameters: {},
      };

      const result = await router.route(request);
      
      expect(result).toHaveProperty('success', true);
      expect(router['executeDirectToolCall']).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const request = {
        operation: 'invalid_operation',
        context: {},
        tools: ['invalid_tool'],
        parameters: {},
      };

      // Force an error
      router['makeRoutingDecision'] = vi.fn().mockRejectedValue(new Error('Test error'));

      const result = await router.route(request);
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', 'Test error');
    });
  });

  describe('analyzeComplexity', () => {
    it('should analyze the complexity of a request', () => {
      const request = {
        operation: 'research',
        context: { projectType: 'web', stage: 'discovery' },
        tools: ['research_guidant', 'web_search'],
        parameters: { query: 'What are the best React state management libraries?' },
      };

      const complexity = router['analyzeComplexity'](request);
      
      expect(complexity).toBeGreaterThan(1);
    });
  });
}); 