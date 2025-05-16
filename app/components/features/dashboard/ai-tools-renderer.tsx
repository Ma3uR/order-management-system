import React from "react";
import { OrderTool } from "./ai-tools-components/orders";
import { ProductsTool } from "./ai-tools-components/products";

interface ToolRendererProps {
  tool: string;
  result: any;
}

export function AiToolRenderer({ tool, result }: ToolRendererProps) {
  if (!result) return null;

  // Order display logic
  if (tool === "getLastOrder" && result.orders) {
    return <OrderTool orders={result.orders} />;
  }
  
  // Products being assembled display logic
  if (tool === "getProductsBeingAssembled" && result.products) {
    return (
      <ProductsTool 
        products={result.products} 
        ordersCount={result.ordersCount || 0} 
      />
    );
  }

  // Default case - no recognized tool or data format
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-medium mb-2">Tool Result</h3>
      <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto max-h-96">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
} 