import { OrdersResponse, StatusResponse } from '@/app/types/pocketbase-types';
import { Button } from "@/app/components/shared/ui/button";
import { UtilityService } from '@/app/services/utilityService';
import { StatusSelect } from "@/app/components/shared/ui/StatusSelect";

interface OrderListProps {
  orders: OrdersResponse[];
  onViewDetails: (order: OrdersResponse) => void;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onStatusChange: (orderId: string, statusId: string) => Promise<void>;
  onRestoreOrder: (orderId: string) => Promise<void>;
  showRestore?: boolean;
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
  onRestoreOrder,
  showRestore,
  translations,
  statuses,
  translateStatus
}: OrderListProps) {
  const handleDelete = (orderId: string) => {
    if (window.confirm(translations.deleteConfirmation)) {
      onDeleteOrder(orderId);
    }
  };

  // Function to filter statuses based on order's source
  const getFilteredStatusesForOrder = (order: OrdersResponse) => {
    return statuses.filter(status => {
      // Include statuses that belong to the same source as the order
      if (status.source === order.source) return true;
      
      // Include app-specific statuses (no source or empty source)
      if (!status.source || status.source === '') return true;
      
      return false;
    });
  };

  return (
    <>
      {/* Mobile view - Card layout */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {orders.map((order) => (
          <div
            key={order.id}
            className="border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors shadow-sm"
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest('button') && 
                  !(e.target as HTMLElement).closest('select')) {
                onViewDetails(order);
              }
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-medium text-sm">#{order.orderNumber}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(order.created_at_marketplace || order.created).toLocaleDateString()}
              </div>
            </div>
            
            <div className="text-sm font-medium mb-2">{order.fullName}</div>
            
            <div className="mb-2">
              <StatusSelect
                status={order.status ? {
                  id: order.status,
                  name: getFilteredStatusesForOrder(order).find(s => s.id === order.status)?.name || '',
                  color: getFilteredStatusesForOrder(order).find(s => s.id === order.status)?.color || '#000000'
                } : undefined}
                statuses={getFilteredStatusesForOrder(order)}
                onStatusChange={async (statusId) => {
                  if (!order) return;
                  await onStatusChange(order.id, statusId);
                }}
                translateStatus={translateStatus}
                getContrastColor={UtilityService.getContrastColor}
                className="w-full"
              />
            </div>
            
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs text-muted-foreground">{translations.amount}</div>
              <div className="font-medium">{UtilityService.formatCurrency(Number(order.amount))}</div>
            </div>
            
            <div className="flex items-center justify-between gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(order);
                }}
              >
                {translations.details}
              </Button>
              
              {showRestore ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-2 flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestoreOrder(order.id);
                  }}
                >
                  Restore
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs h-8 px-2 flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(order.id);
                  }}
                >
                  Archive
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop view - Table layout */}
      <table className="w-full hidden md:table border border-border rounded-md">
        <thead className="bg-muted/50 sticky top-0 z-10">
          <tr className="border-b border-border">
            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
              {translations.orderNumber}
            </th>
            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
              {translations.fullName}
            </th>
            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
              {translations.status}
            </th>
            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
              {translations.amount}
            </th>
            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
              {translations.createdAt}
            </th>
            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
              {translations.actions}
            </th>
          </tr>
        </thead>
        <tbody>
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
              <td className="p-3 align-middle">{order.orderNumber}</td>
              <td className="p-3 align-middle">{order.fullName}</td>
              <td className="p-3 align-middle">
                <StatusSelect
                  status={order.status ? {
                    id: order.status,
                    name: getFilteredStatusesForOrder(order).find(s => s.id === order.status)?.name || '',
                    color: getFilteredStatusesForOrder(order).find(s => s.id === order.status)?.color || '#000000'
                  } : undefined}
                  statuses={getFilteredStatusesForOrder(order)}
                  onStatusChange={async (statusId) => {
                    if (!order) return;
                    await onStatusChange(order.id, statusId);
                  }}
                  translateStatus={translateStatus}
                  getContrastColor={UtilityService.getContrastColor}
                />
              </td>
              <td className="p-3 align-middle">
                {UtilityService.formatCurrency(Number(order.amount))}
              </td>
              <td className="p-3 align-middle">
                {new Date(order.created_at_marketplace || order.created).toLocaleString()}
              </td>
              <td className="p-3 align-middle">
                <div className="flex items-center gap-2">
                  {showRestore ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreOrder(order.id);
                        }}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(order.id);
                        }}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(order.id);
                      }}
                    >
                      Archive
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(order);
                    }}
                  >
                    {translations.details}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
} 