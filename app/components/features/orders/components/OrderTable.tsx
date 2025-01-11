import { Button } from "@/app/components/shared/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/shared/ui/table"
import { StatusSelect } from "@/app/components/shared/ui/StatusSelect"
import { Eye, Trash2 } from 'lucide-react'
import { OrdersResponse, StatusResponse, CurrencyResponse } from '@/app/types/pocketbase-types';
import { toast, Toaster } from 'sonner';
import { useEffect, useRef } from 'react';
import pb from '@/app/lib/pocketbase';

type OrderWithExpand = OrdersResponse & {
  expand?: {
    currency?: CurrencyResponse;
  };
};

interface OrdersTableProps {
  orders: OrderWithExpand[]
  onViewDetails: (order: OrderWithExpand) => void
  onDeleteOrder: (orderId: string) => Promise<void>
  translations: {
    orderNumber: string
    fullName: string
    status: string
    amount: string
    createdAt: string
    details: string
    delete: string
    actions: string
    deleteConfirmation: string
  }
  statuses: StatusResponse[]
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
  // Keep track of whether the current user initiated the change
  const userActionRef = useRef<string | null>(null);

  useEffect(() => {
    // Subscribe to all order changes
    const subscription = pb.collection('orders').subscribe('*', (e) => {
      const isUserAction = userActionRef.current === e.record.id;
      
      // Handle different actions
      switch (e.action) {
        case 'delete':
          if (!isUserAction) {
            toast.info("Order Deleted", {
              description: `Order ${e.record.orderNumber} was deleted by another user`
            });
          }
          break;
        case 'update':
          if (!isUserAction) {
            toast.info("Order Updated", {
              description: `Order ${e.record.orderNumber} was updated by another user`
            });
          }
          break;
        case 'create':
          toast.info("New Order", {
            description: `Order ${e.record.orderNumber} was created`
          });
          break;
      }
      
      // Reset the user action flag
      userActionRef.current = null;
    }, {
      expand: 'currency,status'
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.then(sub => sub());
    };
  }, []);

  const handleDelete = async (orderId: string) => {
    if (window.confirm(translations.deleteConfirmation)) {
      try {
        // Set the user action flag before deletion
        userActionRef.current = orderId;
        await onDeleteOrder(orderId);
        toast.success("Order deleted successfully");
      } catch (error) {
        console.error('Error deleting order:', error);
        toast.error("Failed to delete order. Please try again.");
        // Reset the user action flag on error
        userActionRef.current = null;
      }
    }
  };

  const handleStatusChange = async (orderId: string, statusId: string) => {
    try {
      // Set the user action flag before status change
      userActionRef.current = orderId;
      await onStatusChange(orderId, statusId);
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error("Failed to update order status. Please try again.");
      // Reset the user action flag on error
      userActionRef.current = null;
    }
  };

  return (
    <>
      <Toaster richColors />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{translations.orderNumber}</TableHead>
            <TableHead className="hidden sm:table-cell">{translations.fullName}</TableHead>
            <TableHead>{translations.status}</TableHead>
            <TableHead className="hidden sm:table-cell">{translations.amount}</TableHead>
            <TableHead className="hidden sm:table-cell">{translations.createdAt}</TableHead>
            <TableHead className="text-right">{translations.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow 
              key={`${order.id}-${order.created}`}
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
                  status={order.status ? {
                    id: order.status,
                    name: statuses.find(s => s.id === order.status)?.name || '',
                    color: statuses.find(s => s.id === order.status)?.color || '#000000'
                  } : undefined}
                  statuses={statuses}
                  onStatusChange={(statusId) => handleStatusChange(order.id, statusId)}
                  translateStatus={translateStatus}
                  getContrastColor={getContrastColor}
                />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {order.expand?.currency?.symbol || ''}
                {order.amount.toFixed(2)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {new Date(order.created).toLocaleString()}
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
                      handleDelete(order.id);
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
    </>
  )
}

