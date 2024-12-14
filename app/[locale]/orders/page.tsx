import {getTranslations} from 'next-intl/server';
import OrdersManagement from '@/components/OrdersManagement';
import { fetchOrders } from '@/lib/api';
import { ErrorBoundaryClient } from '@/components/error-boundary-client';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const t = await getTranslations('Orders');
  const orders = await fetchOrders();

  const translations = {
    title: t('title'),
    totalAmount: t('totalAmount'),
    filterOrders: t('filterOrders'),
    filterOrdersPlaceholder: t('filterOrdersPlaceholder'),
    createNewOrder: t('createNewOrder'),
    orders: t('orders'),
    orderNumber: t('orderNumber'),
    fullName: t('fullName'),
    status: t('status'),
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
    selectStatus: t('selectStatus'),
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
    backToDashboard: t('backToDashboard'),
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
          id: order.id,
          orderNumber: order.orderNumber || '',
          source: order.source || '',
          deliveryMethod: {
            id: order.deliveryMethod?.id || '',
            name: order.deliveryMethod?.name || ''
          },
          deliveryPostNumber: order.deliveryPostNumber || '',
          phoneNumber: order.phoneNumber || '',
          fullName: order.fullName || '',
          products: typeof order.products === 'string' 
            ? JSON.parse(order.products) 
            : order.products || [],
          numberOfItems: order.numberOfItems || 0,
          paymentMethod: {
            id: order.paymentMethod?.id || '',
            name: order.paymentMethod?.name || ''
          },
          amount: order.amount || 0,
          status: {
            id: order.status?.id || '',
            name: order.status?.name || '',
            color: order.status?.color || '#cbd5e1'
          },
          currency: {
            id: order.currency?.id || '',
            code: order.currency?.code || '',
            symbol: order.currency?.symbol || ''
          },
          createdAt: order.createdAt || new Date().toISOString(),
          updatedAt: order.updatedAt || new Date().toISOString(),
          productsText: typeof order.products === 'string' 
            ? order.products 
            : JSON.stringify(order.products || [], null, 2),
          notes: order.notes || ''
        }))} 
      />
    </ErrorBoundaryClient>
  );
}
