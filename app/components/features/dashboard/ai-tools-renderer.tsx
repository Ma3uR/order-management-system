import React from "react";
import { OrderTool } from "./ai-tools-components/orders";
import { ProductsTool } from "./ai-tools-components/products";
import { type AiOrder } from "./ai-tools-components/orders/order-list";
import { type Product } from "./ai-tools-components/products/product-collection";
import { FinancialBalanceDisplay } from "./ai-tools-components/finances/financial-balance-display";
import { SalaryCalculationDisplay } from "./ai-tools-components/finances/salary-calculation-display";

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

// Add a type definition for OrderWithSalary
interface OrderWithSalary {
  id?: string;
  orderNumber?: string;
  source: string;
  customerName?: string;
  fullName?: string;
  total?: number;
  amount?: number;
  salary?: number;
  date?: string;
  createdAt?: string;
}

// Add a type definition for SalaryData that matches the component's expected type
type SalaryData = {
  periodStart: string;
  periodEnd: string;
  totalSalary: number;
  salaryBreakdown: Array<{ source: string, commission: number, orderCount: number }>;
  orderCount: number;
  totalOrderValue: number;
  totalProductionCosts: number;
  orders?: OrderWithSalary[];
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

  // Salary calculations display logic
  if (tool === "salaryCalculator" && "salaryData" in result) {
    return (
      <SalaryCalculationDisplay 
        salaryData={result.salaryData as SalaryData} 
        isLoading={Boolean(result.isLoading)} 
      />
    );
  }
  
  // Direct salary data display (no salaryData wrapper)
  if (tool === "salaryCalculator" && 
      "totalSalary" in result && 
      "salaryBreakdown" in result) {
    
    // Log the result to see what's available
    console.log("Salary Calculator Data:", result);
    
    // Transform the salaryBreakdown to match expected format
    const transformedData = {
      ...result, // Keep all original properties
      salaryBreakdown: (result.salaryBreakdown as Array<{
        source: string;
        orderValue: number;
        productionCost: number;
        salary: number;
        percentage: number;
      }>).map(item => ({
        source: item.source,
        commission: item.percentage || item.salary,
        orderCount: Math.round(item.orderValue / ((result.totalOrderValue as number) / (result.orderCount as number))) || 0
      }))
    } as SalaryData;
    
    // Ensure the orders are passed along if they exist
    if ("orders" in result && Array.isArray(result.orders)) {
      console.log(`Found ${result.orders.length} orders in the result`);
      transformedData.orders = result.orders as OrderWithSalary[];
    }
    
    return (
      <SalaryCalculationDisplay 
        salaryData={transformedData} 
        isLoading={false}
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