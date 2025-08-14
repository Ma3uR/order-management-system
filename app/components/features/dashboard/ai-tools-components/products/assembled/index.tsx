import OrdersBeingAssembled from "./orders-being-assembled"

interface Product {
  name: string;
  quantity: number;
  price?: number;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: string;
  phoneNumber: string;
  products: Product[];
}

interface AggregatedProduct {
  name: string;
  quantity: number;
}

interface OrdersBeingAssembledData {
  ordersCount: number;
  orders: Order[];
  productsCount: number;
  products: AggregatedProduct[];
}

type ProductsToolProps = {
  data: OrdersBeingAssembledData;
  isLoading?: boolean;
}

export function ProductsTool({ data, isLoading = false }: ProductsToolProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-3">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-3">
      <OrdersBeingAssembled data={data} />
    </div>
  )
} 