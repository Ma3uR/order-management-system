import { OrdersResponse, StatusResponse } from '@/app/types/pocketbase-types';
import { Button } from "@/app/components/shared/ui/button";
import { UtilityService } from '@/app/services/utilityService';
import { StatusSelect } from "@/app/components/shared/ui/StatusSelect";

interface OrderListProps {
  orders: OrdersResponse[];
  onViewDetails: (order: OrdersResponse) => void;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onStatusChange: (orderId: string, statusId: string) => Promise<void>;
  translations: {
    orderNumber: string;
    fullName: string;
    status: string;
    amount: string;
    createdAt: string;
    actions: string;
    details: string;
    delete: string;
    deleteConfirmation: string;
  };
  statuses: StatusResponse[];
  translateStatus: (status: string) => string;
}

export function OrderList({
  orders,
  onViewDetails,
  onDeleteOrder,
  onStatusChange,
  translations,
  statuses,
  translateStatus
}: OrderListProps) {
  const handleDelete = (orderId: string) => {
    if (window.confirm(translations.deleteConfirmation)) {
      onDeleteOrder(orderId);
    }
  };

  return (
    <div className="rounded-md border border-border">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {translations.orderNumber}
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {translations.fullName}
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {translations.status}
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {translations.amount}
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {translations.createdAt}
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {translations.actions}
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('button') && 
                      !(e.target as HTMLElement).closest('select')) {
                    onViewDetails(order);
                  }
                }}
              >
                <td className="p-4 align-middle">{order.orderNumber}</td>
                <td className="p-4 align-middle">{order.fullName}</td>
                <td className="p-4 align-middle">
                  <StatusSelect
                    status={order.status ? {
                      id: order.status,
                      name: statuses.find(s => s.id === order.status)?.name || '',
                      color: statuses.find(s => s.id === order.status)?.color || '#000000'
                    } : undefined}
                    statuses={statuses}
                    onStatusChange={async (statusId) => {
                      if (!order) return;
                      await onStatusChange(order.id, statusId);
                    }}
                    translateStatus={translateStatus}
                    getContrastColor={UtilityService.getContrastColor}
                  />
                </td>
                <td className="p-4 align-middle">
                  {UtilityService.formatCurrency(Number(order.amount))}
                </td>
                <td className="p-4 align-middle">
                  {new Date(order.created).toLocaleString()}
                </td>
                <td className="p-4 align-middle">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(order)}
                    >
                      {translations.details}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(order.id)}
                    >
                      {translations.delete}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 