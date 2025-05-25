import React from "react";
import { OrderTool } from "./ai-tools-components/orders";
import { ProductsTool } from "./ai-tools-components/products";
import { type AiOrder } from "./ai-tools-components/orders/order-list";
import { type Product } from "./ai-tools-components/products/product-collection";
import { FinancialBalanceDisplay } from "./ai-tools-components/finances/financial-balance-display";

// Define the BalanceData type to match what FinancialBalanceDisplay expects
type BalanceData = {
  periodStart: string;
  periodEnd: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  incomeBreakdown: Array<{ source: string, amount: number }>;
  expensesBreakdown: Array<{ category: string, amount: number }>;
};

// Define types for possible tool results
interface OrderToolResult {
  orders: AiOrder[];
}

interface ProductsToolResult {
  products: Product[];
  ordersCount?: number;
}

interface FinancialBalanceResult {
  balanceData: BalanceData;
  isLoading?: boolean;
}

// Union type for all possible tool results
type ToolResult = OrderToolResult | ProductsToolResult | FinancialBalanceResult | Record<string, unknown>;

interface ToolRendererProps {
  tool: string;
  result: ToolResult;
}

export function AiToolRenderer({ tool, result }: ToolRendererProps) {
  if (!result) return null;

  // Order display logic
  if (tool === "getLastOrder" && "orders" in result) {
    return <OrderTool orders={result.orders as AiOrder[]} />;
  }
  
  // Products being assembled display logic
  if (tool === "getProductsBeingAssembled" && "products" in result) {
    return (
      <ProductsTool 
        products={result.products as Product[]} 
        ordersCount={"ordersCount" in result ? result.ordersCount as number || 0 : 0} 
      />
    );
  }

  // Financial balance display logic
  if ((tool === "getFinancialBalance" || tool === "calculateBalance") && "balanceData" in result) {
    return (
      <FinancialBalanceDisplay 
        balanceData={result.balanceData as BalanceData} 
        isLoading={Boolean(result.isLoading)}
      />
    );
  }
  
  // Direct financial data display (no balanceData wrapper)
  if (tool === "calculateBalance" && 
      "totalIncome" in result && 
      "totalExpenses" in result && 
      "netBalance" in result) {
    return (
      <FinancialBalanceDisplay 
        balanceData={result as BalanceData} 
        isLoading={false}
      />
    );
  }

  // Default case - no recognized tool or data format
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-medium mb-2">Tool: {tool}</h3>
      <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto max-h-96">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
} 