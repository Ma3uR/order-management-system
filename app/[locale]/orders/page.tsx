import {getTranslations} from 'next-intl/server';
import { OrdersManagement } from '@/app/components/features/orders/OrdersManagement';
import { fetchOrders } from '@/app/lib/pocketbase';
import { ErrorBoundaryClient } from '@/app/components/layouts/providers/ErrorBoundary';
import { OrdersResponse } from '@/app/types/pocketbase-types';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const t = await getTranslations('Orders');
  const orders = await fetchOrders();

  const translations = {
    title: t('title'),
    totalAmount: t('totalAmount'),
    totalOrders: t('totalOrders'),
    filterOrders: t('filterOrders'),
    filterOrdersPlaceholder: t('filterOrdersPlaceholder'),
    createNewOrder: t('createNewOrder'),
    backToDashboard: t('backToDashboard'),
    filters: t('filters'),
    status: t('status'),
    selectStatus: t('selectStatus'),
    all: t('all'),
    amountRange: t('amountRange'),
    resetFilters: t('resetFilters'),
    orders: t('orders'),
    orderNumber: t('orderNumber'),
    fullName: t('fullName'),
    amount: t('amount'),
    createdAt: t('createdAt'),
    actions: t('actions'),
    details: t('details'),
    edit: t('edit'),
    delete: t('delete'),
    deleteConfirmation: t('deleteConfirmation'),
    deleteError: t('deleteError'),
    orderDetails: t('orderDetails'),
    source: t('source'),
    deliveryMethod: t('deliveryMethod'),
    deliveryPostNumber: t('deliveryPostNumber'),
    phoneNumber: t('phoneNumber'),
    products: t('products'),
    numberOfItems: t('numberOfItems'),
    paymentMethod: t('paymentMethod'),
    editOrder: t('editOrder'),
    updateOrder: t('updateOrder'),
    statuses: {
      beingProcessed: t('statuses.beingProcessed'),
      shipped: t('statuses.shipped'),
      delivered: t('statuses.delivered'),
      cancelled: t('statuses.cancelled'),
    },
    deliveryMethods: {
      ukrposhta: t('deliveryMethods.ukrposhta'),
      novaPoshta: t('deliveryMethods.novaPoshta'),
      parcelLocker: t('deliveryMethods.parcelLocker'),
      rozetka: t('deliveryMethods.rozetka'),
      mistExpress: t('deliveryMethods.mistExpress'),
    },
    createNewOrderDescription: t('createNewOrderDescription'),
    selectDeliveryMethod: t('selectDeliveryMethod'),
    selectPaymentMethod: t('selectPaymentMethod'),
    selectSource: t('selectSource'),
    sourceRequired: t('sourceRequired'),
    blacklistedCustomerWarning: t('blacklistedCustomerWarning'),
    notes: t('notes'),
    notesPlaceholder: t('notesPlaceholder'),
    showing: t('showing'),
    of: t('of'),
    results: t('results'),
    previous: t('previous'),
    next: t('next'),
    page: t('page'),
    addProduct: t('addProduct'),
    productName: t('productName'),
    quantity: t('quantity'),
    price: t('price'),
    product: t('product'),
    totalItems: t('totalItems'),
  };

  return (
    <ErrorBoundaryClient>
      <OrdersManagement 
        translations={translations} 
        initialOrders={orders.map(order => ({
          ...order,
          orderNumber: order.orderNumber || '',
          source: order.source || '',
          deliveryMethod: order.deliveryMethod || '',
          deliveryPostNumber: order.deliveryPostNumber || '',
          phoneNumber: order.phoneNumber || '',
          fullName: order.fullName || '',
          products: typeof order.products === 'string' ? JSON.parse(order.products) : order.products || [],
          numberOfItems: order.numberOfItems || 0,
          paymentMethod: order.paymentMethod || '',
          amount: order.amount || 0,
          status: order.status || '',
          currency: order.currency || '',
          createdAt: order.created || new Date().toISOString(),
          updatedAt: order.updated || new Date().toISOString(),
          productsText: typeof order.products === 'string' ? order.products : JSON.stringify(order.products || [], null, 2),
          notes: order.notes || ''
        }) as unknown as OrdersResponse)} 
      />
    </ErrorBoundaryClient>
  );
}
