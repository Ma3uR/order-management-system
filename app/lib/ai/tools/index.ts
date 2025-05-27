import { ToolsRegistry } from './types';

import { getLastOrder } from './get-last-order';
import { getProductsBeingAssembled } from './get-products-being-assembled';
import { calculateBalance } from './calculate-balance';
import { salaryCalculator } from './salary-calculations';
import { productPopularity } from './product-popularity';
import { averageOrderValue } from './average-order-value';

export const tools: ToolsRegistry = {
  getLastOrder,
  getProductsBeingAssembled,
  calculateBalance,
  salaryCalculator,
  productPopularity,
  averageOrderValue
} as ToolsRegistry;

export * from './types';

export * from './get-last-order';
export * from './get-products-being-assembled';
export * from './calculate-balance'; 
export * from './salary-calculations';
export * from './product-popularity';
export * from './average-order-value';