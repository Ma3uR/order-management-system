import { ToolsRegistry } from './types';
import { displayWeather } from './weather';
import { getLastOrder } from './get-last-order';
import { getProductsBeingAssembled } from './get-products-being-assembled';
import { calculateBalance } from './calculate-balance';
import { salaryCalculator } from './salary-calculations';
export const tools: ToolsRegistry = {
  displayWeather,
  getLastOrder,
  getProductsBeingAssembled,
  calculateBalance,
  salaryCalculator,
} as ToolsRegistry;

export * from './types';
export * from './weather';
export * from './get-last-order';
export * from './get-products-being-assembled';
export * from './calculate-balance'; 
export * from './salary-calculations';