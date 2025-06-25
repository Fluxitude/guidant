import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file if it exists
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Define environment variable schema
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('8080'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Redis configuration
  REDIS_URL: z.string().optional(),
  
  // Mastra API configuration
  MASTRA_API_KEY: z.string(),
  
  // Model configuration
  ORCHESTRATOR_MODEL_ID: z.string().default('gemini-2.5-pro'),
  TECH_AGENT_MODEL_ID: z.string().default('gemini-2.5-flash'),
  MARKET_AGENT_MODEL_ID: z.string().default('gemini-2.5-flash'),
  UX_AGENT_MODEL_ID: z.string().default('gemini-2.5-flash'),
  
  // Integration services
  CONTEXT7_ENABLED: z.string().transform(val => val === 'true').default('true'),
  TAVILY_ENABLED: z.string().transform(val => val === 'true').default('true'),
  FIRECRAWL_ENABLED: z.string().transform(val => val === 'true').default('true'),
  STAGEHAND_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // Integration API keys
  TAVILY_API_KEY: z.string().optional(),
  CONTEXT7_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  STAGEHAND_API_KEY: z.string().optional(),
});

// Parse and validate environment variables
export const env = envSchema.parse(process.env);

// Export type for environment variables
export type Env = z.infer<typeof envSchema>; 