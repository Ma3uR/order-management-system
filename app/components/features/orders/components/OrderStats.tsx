import { OrdersResponse, CurrencyOptionsResponse } from '@/app/types/pocketbase-types';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { StatsCard } from "@/app/components/shared/ui/StatsCard";
import { UtilityService } from '@/app/services/utilityService';

interface OrdersResponseWithExpand extends OrdersResponse {
  expand?: {
    currency?: CurrencyOptionsResponse;
  };
}

interface OrderStatsProps {
  orders: OrdersResponseWithExpand[];
  translations: {
    totalAmount: string;
    totalOrders: string;
  };
}

export function OrderStats({ orders, translations }: OrderStatsProps) {
  if (orders.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-1">
        <div className="md:col-span-1 col-span-full">
          <StatsCard
            title={translations.totalAmount}
            value="€0.00"
            change={{ value: "0%", positive: true }}
            data={[0, 0, 0, 0, 0, 0, 0]}
          />
        </div>
        <div className="md:col-span-1 col-span-full">
          <StatsCard
            title={translations.totalOrders}
            value="0"
            change={{ value: "0%", positive: true }}
            data={[0, 0, 0, 0, 0, 0, 0]}
          />
        </div>
      </div>
    );
  }

  const stats = UtilityService.getMonthlyStats(orders);
  const currency = orders[0]?.expand?.currency?.symbol || '₴';

  return (
    <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-1">
      <div className="md:col-span-1 col-span-full">
        <StatsCard
          title={translations.totalAmount}
          value={`${currency}${stats.currentMonthAmount.toFixed(2)}`}
          change={{ 
            value: `${stats.amountChange >= 0 ? '+' : ''}${stats.amountChange.toFixed(1)}%`,
            positive: stats.amountChangePositive 
          }}
          data={stats.graphDataAmount}
        />
      </div>
      <div className="md:col-span-1 col-span-full">
        <StatsCard
          title={translations.totalOrders}
          value={orders.length.toString()}
          change={{ 
            value: `${stats.orderCountChange >= 0 ? '+' : ''}${stats.orderCountChange.toFixed(1)}%`,
            positive: stats.orderCountChangePositive 
          }}
          data={stats.graphDataOrders}
        />
      </div>
    </div>
  );
} 