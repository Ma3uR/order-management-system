import { ToolsRegistry } from './types';
import { displayWeather } from './weather';
import { getLastOrder } from './get-last-order';

export const tools: ToolsRegistry = {
  displayWeather,
  getLastOrder,
} as ToolsRegistry;

export * from './types';
export * from './weather';
export * from './get-last-order'; 