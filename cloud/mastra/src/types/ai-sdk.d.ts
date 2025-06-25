/**
 * Type definitions for @ai-sdk modules
 */

declare module '@ai-sdk/vertexai' {
  export function vertexai(modelId: string): any;
}

declare module '@mastra/loggers' {
  export interface Logger {
    info(message: string, context?: Record<string, any>): void;
    warn(message: string, context?: Record<string, any>): void;
    error(message: string, context?: Record<string, any>): void;
    debug(message: string, context?: Record<string, any>): void;
  }
  
  export function createLogger(options: {
    name: string;
    level?: string;
  }): Logger;
} 