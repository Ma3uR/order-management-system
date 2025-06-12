import { ErrorBoundaryClient } from '@/app/components/layouts/providers/ErrorBoundary';
import { OrdersDashboard } from '@/app/components/features/orders/components/dashboard/orders-dashboard';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  return (
    <ErrorBoundaryClient>
      <OrdersDashboard /> 
    </ErrorBoundaryClient>
  );
}