/**
 * Configuration utility for Strategic Agent Synthesis Architecture
 */

import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { env } from './env.js';
import { validateMCPEnvironment } from '../mcp/server-config.js';

// Define Redis configuration schema
const RedisConfigSchema = z.object({
  url: z.string().optional(),
  host: z.string().optional(),
  port: z.number().optional(),
  password: z.string().optional(),
  db: z.number().optional(),
  keyPrefix: z.string().optional(),
  ttl: z.number().optional().default(86400), // 24 hours in seconds
});

// Define server configuration schema
const ServerConfigSchema = z.object({
  host: z.string().default('0.0.0.0'),
  port: z.number().default(8080),
  cors: z.object({
    enabled: z.boolean().default(true),
    origin: z.string().or(z.array(z.string())).optional(),
  }).optional().default({}),
  compression: z.boolean().default(true),
});

// Define agent configuration schema
const AgentConfigSchema = z.object({
  technicalAgent: z.object({
    enabled: z.boolean().default(true),
    modelId: z.string().optional(),
    context7Enabled: z.boolean().default(true),
  }).optional().default({}),
  marketAgent: z.object({
    enabled: z.boolean().default(true),
    modelId: z.string().optional(),
    tavilyEnabled: z.boolean().default(true),
  }).optional().default({}),
  uiuxAgent: z.object({
    enabled: z.boolean().default(true),
    modelId: z.string().optional(),
    stagehandEnabled: z.boolean().default(true),
  }).optional().default({}),
  generalAgent: z.object({
    enabled: z.boolean().default(true),
    modelId: z.string().optional(),
  }).optional().default({}),
});

// Define monitoring configuration schema
const MonitoringConfigSchema = z.object({
  enabled: z.boolean().default(true),
  errorRateThreshold: z.number().default(0.05), // 5%
  latencyThreshold: z.number().default(2000), // 2 seconds
  healthCheckInterval: z.number().default(60000), // 1 minute
});

// Define cache configuration schema
const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  defaultTtl: z.number().default(3600), // 1 hour in seconds
  maxSize: z.number().default(1000), // Maximum number of items in memory cache
});

// Define full configuration schema
const ConfigSchema = z.object({
  server: ServerConfigSchema.optional().default({}),
  redis: RedisConfigSchema.optional(),
  agents: AgentConfigSchema.optional().default({}),
  monitoring: MonitoringConfigSchema.optional().default({}),
  cache: CacheConfigSchema.optional().default({}),
});

// Export Config type
export type Config = z.infer<typeof ConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;

/**
 * Load configuration from environment variables and config file
 */
export function loadConfig(): Config {
  // Start with defaults
  const config: Partial<Config> = {};

  // Load from config file if available
  const configPath = process.env.CONFIG_PATH || path.resolve(process.cwd(), 'config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      Object.assign(config, fileConfig);
      console.log(`Loaded configuration from ${configPath}`);
    } catch (error) {
      console.warn(`Error loading config from ${configPath}:`, error);
    }
  }

  // Override with environment variables
  config.server = {
    ...config.server,
    port: env.PORT,
    host: '0.0.0.0',
  };

  // Configure Redis from environment
  if (env.REDIS_URL) {
    config.redis = {
      ...config.redis,
      url: env.REDIS_URL,
    };
  }

  // Configure agents from environment
  config.agents = {
    ...config.agents,
    technicalAgent: {
      ...config.agents?.technicalAgent,
      enabled: true,
      modelId: env.TECH_AGENT_MODEL_ID,
      context7Enabled: env.CONTEXT7_ENABLED,
    },
    marketAgent: {
      ...config.agents?.marketAgent,
      enabled: true,
      modelId: env.MARKET_AGENT_MODEL_ID,
      tavilyEnabled: env.TAVILY_ENABLED,
    },
    uiuxAgent: {
      ...config.agents?.uiuxAgent,
      enabled: true,
      modelId: env.UX_AGENT_MODEL_ID,
      stagehandEnabled: env.STAGEHAND_ENABLED,
    },
    generalAgent: {
      ...config.agents?.generalAgent,
      enabled: true,
      modelId: env.ORCHESTRATOR_MODEL_ID,
    },
  };

  // Validate and return the config
  return ConfigSchema.parse(config);
}

/**
 * Create Redis client configuration
 */
export function createRedisConfig(config: Config): RedisConfig {
  if (!config.redis) {
    return {};
  }

  return {
    url: config.redis.url,
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    keyPrefix: config.redis.keyPrefix || 'guidant-synthesis:',
    ttl: config.redis.ttl || 86400, // 24 hours in seconds
  };
}

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(config: Config): boolean {
  return !!(config.redis?.url || (config.redis?.host && config.redis?.port));
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate server config
  if (config.server) {
    if (config.server.port && (isNaN(config.server.port) || config.server.port < 0 || config.server.port > 65535)) {
      errors.push('Invalid server port');
    }
    
    if (config.server.timeout && (isNaN(config.server.timeout) || config.server.timeout < 0)) {
      errors.push('Invalid server timeout');
    }
  }
  
  // Validate agent cache expiry
  if (config.agents) {
    Object.entries(config.agents).forEach(([agentName, agentConfig]) => {
      if (agentConfig?.cacheExpiry && (isNaN(agentConfig.cacheExpiry) || agentConfig.cacheExpiry < 0)) {
        errors.push(`Invalid cache expiry for ${agentName} agent`);
      }
    });
  }
  
  // Validate logging config
  if (config.logging) {
    if (config.logging.format && !['json', 'pretty'].includes(config.logging.format)) {
      errors.push('Invalid logging format');
    }
    
    if (config.logging.destination && !['console', 'file'].includes(config.logging.destination)) {
      errors.push('Invalid logging destination');
    }
    
    if (config.logging.destination === 'file' && !config.logging.filePath) {
      errors.push('Log file path required when logging to file');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
} 