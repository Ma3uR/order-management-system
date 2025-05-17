import { z } from 'zod';

export interface ToolDefinition<TParams, TResult> {
  description: string;
  parameters: z.ZodType<TParams>;
  execute: (params: TParams) => Promise<TResult>;
}

// This allows any combination of param and result types
export interface ToolsRegistry {
  [key: string]: ToolDefinition<unknown, unknown>;
}

export interface WeatherResponse {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
} 