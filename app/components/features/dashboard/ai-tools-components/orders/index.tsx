import { type Order, OrderList } from "./order-list"

type OrderToolProps = {
  orders: Order[]
  isLoading?: boolean
}

export function OrderTool({ orders, isLoading = false }: OrderToolProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border p-3">
      <OrderList orders={orders} isLoading={isLoading} />
    </div>
  )
}
