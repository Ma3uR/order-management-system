import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Order {
  id: string
  orderNumber: string
  fullName: string
  status?: {
    id: string;
    name: string;
    color: string;
  }
  amount: number
  currency: {
    symbol: string
  }
  createdAt: string
}

interface OrdersTableProps {
  orders: Order[]
  onViewDetails: (order: Order) => void
  onDeleteOrder: (orderId: string) => void
  translations: {
    orderNumber: string
    fullName: string
    status: string
    amount: string
    createdAt: string
    details: string
    delete: string
  }
}

export function OrdersTable({
  orders,
  onViewDetails,
  onDeleteOrder,
  translations,
}: OrdersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{translations.orderNumber}</TableHead>
          <TableHead>{translations.fullName}</TableHead>
          <TableHead>{translations.status}</TableHead>
          <TableHead>{translations.amount}</TableHead>
          <TableHead>{translations.createdAt}</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.orderNumber}</TableCell>
            <TableCell>{order.fullName}</TableCell>
            <TableCell>
              <Badge
                style={{
                  backgroundColor: order.status?.color,
                  color: '#fff'
                }}
              >
                {order.status?.name}
              </Badge>
            </TableCell>
            <TableCell>
              {order.currency.symbol}
              {order.amount.toFixed(2)}
            </TableCell>
            <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(order)}
                >
                  {translations.details}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteOrder(order.id)}
                >
                  {translations.delete}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

