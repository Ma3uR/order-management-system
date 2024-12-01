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
import { StatusSelect } from "@/components/StatusSelect"
import { Eye, Trash2 } from 'lucide-react'
import { cn } from "@/lib/utils"

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

interface Status {
  id: string
  name: string
  color: string
  priority: number
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
  statuses: Status[]
  onStatusChange: (orderId: string, statusId: string) => Promise<void>
  translateStatus: (status: string) => string
  getContrastColor: (color: string) => string
}

export function OrdersTable({
  orders,
  onViewDetails,
  onDeleteOrder,
  translations,
  statuses,
  onStatusChange,
  translateStatus,
  getContrastColor
}: OrdersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{translations.orderNumber}</TableHead>
          <TableHead className="hidden sm:table-cell">{translations.fullName}</TableHead>
          <TableHead>{translations.status}</TableHead>
          <TableHead className="hidden sm:table-cell">{translations.amount}</TableHead>
          <TableHead className="hidden sm:table-cell">{translations.createdAt}</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow 
            key={`${order.id}-${order.createdAt}`}
            className="sm:hover:bg-accent/50 cursor-pointer"
            onClick={(e) => {
              // Only trigger on mobile and if not clicking buttons
              if (window.innerWidth < 640 && !(e.target as HTMLElement).closest('button')) {
                onViewDetails(order);
              }
            }}
          >
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium">{order.orderNumber}</div>
                <div className="sm:hidden text-sm text-muted-foreground">
                  {order.fullName}
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {order.fullName}
            </TableCell>
            <TableCell>
              <StatusSelect
                status={order.status}
                statuses={statuses}
                onStatusChange={(statusId) => onStatusChange(order.id, statusId)}
                translateStatus={translateStatus}
                getContrastColor={getContrastColor}
              />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {order.currency.symbol}
              {order.amount.toFixed(2)}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {new Date(order.createdAt).toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 sm:flex hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(order);
                  }}
                  title={translations.details}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteOrder(order.id);
                  }}
                  title={translations.delete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

