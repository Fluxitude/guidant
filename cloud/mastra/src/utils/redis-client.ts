/**
 * Redis Client for Strategic Agent Synthesis Architecture
 * 
 * Provides state management and caching capabilities using Redis.
 */

import { createClient, RedisClientType } from 'redis';
import { Logger } from '@mastra/loggers';
import { RedisConfig, isRedisConfigured } from './config.js';

export class RedisStateManager {
  private client: RedisClientType | null = null;
  private logger: Logger;
  private config: RedisConfig;
  private isConnected = false;
  private keyPrefix: string;

  constructor(config: RedisConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.keyPrefix = config.keyPrefix || 'guidant-synthesis:';
  }

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<boolean> {
    if (!isRedisConfigured({ redis: this.config })) {
      this.logger.warn('Redis is not configured, running without state persistence');
      return false;
    }

    try {
      // Create Redis client
      this.client = createClient({
        url: this.config.url,
        socket: {
          host: this.config.host,
          port: this.config.port,
        },
        password: this.config.password,
        database: this.config.db,
      });

      // Set up event handlers
      this.client.on('error', (error) => {
        this.logger.error('Redis client error', { error });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        this.logger.info('Redis client reconnecting');
      });

      this.client.on('end', () => {
        this.logger.info('Redis client connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      this.isConnected = true;
      this.logger.info('Redis client initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Redis client', { error });
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && !!this.client;
  }

  /**
   * Get value from Redis
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const fullKey = this.getFullKey(key);
      const data = await this.client!.get(fullKey);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error('Error getting data from Redis', { key, error });
      return null;
    }
  }

  /**
   * Set value in Redis with expiration
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const serializedData = JSON.stringify(value);
      
      // Use TTL from config if not specified
      const expiry = ttlSeconds || this.config.ttl || 86400; // Default to 24 hours
      
      await this.client!.set(fullKey, serializedData, { EX: expiry });
      return true;
    } catch (error) {
      this.logger.error('Error setting data in Redis', { key, error });
      return false;
    }
  }

  /**
   * Delete value from Redis
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      await this.client!.del(fullKey);
      return true;
    } catch (error) {
      this.logger.error('Error deleting data from Redis', { key, error });
      return false;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.isReady()) {
      return [];
    }

    try {
      const fullPattern = this.getFullKey(pattern);
      const keys = await this.client!.keys(fullPattern);
      
      // Remove prefix from keys
      return keys.map(key => key.replace(this.keyPrefix, ''));
    } catch (error) {
      this.logger.error('Error getting keys from Redis', { pattern, error });
      return [];
    }
  }

  /**
   * Store agent state in Redis
   */
  async storeAgentState(agentId: string, state: any): Promise<boolean> {
    return this.set(`agent:${agentId}:state`, state);
  }

  /**
   * Retrieve agent state from Redis
   */
  async getAgentState<T>(agentId: string): Promise<T | null> {
    return this.get<T>(`agent:${agentId}:state`);
  }

  /**
   * Store research results in Redis
   */
  async storeResearchResults(researchId: string, results: any, ttlSeconds?: number): Promise<boolean> {
    return this.set(`research:${researchId}:results`, results, ttlSeconds);
  }

  /**
   * Retrieve research results from Redis
   */
  async getResearchResults<T>(researchId: string): Promise<T | null> {
    return this.get<T>(`research:${researchId}:results`);
  }

  /**
   * Store routing decision in Redis
   */
  async storeRoutingDecision(requestHash: string, decision: any): Promise<boolean> {
    // Use shorter TTL for routing decisions (1 hour)
    return this.set(`routing:${requestHash}`, decision, 3600);
  }

  /**
   * Retrieve routing decision from Redis
   */
  async getRoutingDecision<T>(requestHash: string): Promise<T | null> {
    return this.get<T>(`routing:${requestHash}`);
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.logger.info('Redis connection closed');
      } catch (error) {
        this.logger.error('Error closing Redis connection', { error });
      } finally {
        this.isConnected = false;
      }
    }
  }

  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
} 