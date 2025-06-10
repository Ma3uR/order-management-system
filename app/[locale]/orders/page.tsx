import {getTranslations} from 'next-intl/server';
import { OrdersManagement } from '@/app/components/features/orders/OrdersManagement';
import { fetchOrders } from '@/app/lib/pocketbase';
import { ErrorBoundaryClient } from '@/app/components/layouts/providers/ErrorBoundary';
import { OrdersResponse } from '@/app/types/pocketbase-types';
import { getOrdersFromSourceText, getOrdersCombinedText } from './actions/translations';
import { OrdersDashboard } from '@/app/components/features/orders/components/dashboard/orders-dashboard';

// Add type definition before the component
type ProductItem = {
  title?: string;
  name?: string;
  quantity: number;
  price: number;
};

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
    dateRange: t('dateRange'),
    selectDateRange: t('selectDateRange'),
    resetFilters: t('resetFilters'),
    orders: t('orders'),
    orderNumber: t('orderNumber'),
    fullName: t('fullName'),
    amount: t('amount'),
    createdAt: t('createdAt'),
    actions: t('actions'),
    actionsAndStatistics: t('actionsAndStatistics'),
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
    mergeStatus: t('mergeStatus'),
    selectMergeStatus: t('selectMergeStatus'),
    mergeNotification: {
      title: t('mergeNotification.title'),
      description: t('mergeNotification.description'),
      phoneMatch: t('mergeNotification.phoneMatch'),
      nameMatch: t('mergeNotification.nameMatch'),
      confirmButton: t('mergeNotification.confirmButton'),
      rejectButton: t('mergeNotification.rejectButton')
    },
    mergeConfirmation: t('mergeConfirmation'),
    mergeDescription: t('mergeDescription'),
    mergeReview: t('mergeReview'),
    keepSeparate: t('keepSeparate'),
    mergeSuccess: t('mergeSuccess'),
    mergeError: t('mergeError'),
    mergedOrderSummary: t('mergedOrderSummary'),
    ordersFromSource: getOrdersFromSourceText,
    ordersCombined: getOrdersCombinedText,
    originalOrders: t('originalOrders'),
    mergeRejected: t('mergeRejected'),
    mergeRejectionError: t('mergeRejectionError'),
    cancel: t('cancel'),
    confirm: t('confirm'),
    productionCost: t('productionCost'),
  };

  return (
    <ErrorBoundaryClient>
      <OrdersDashboard /> 


      {/* <OrdersManagement 
        translations={translations} 
        initialOrders={orders.map(order => {
          // Parse products if they're a string
          const products = typeof order.products === 'string' 
            ? JSON.parse(order.products)
            : (Array.isArray(order.products) ? order.products : []);

          // Ensure each product has required fields
          const validProducts = products.map((product: ProductItem) => ({
            title: product.title || product.name || 'Untitled Product',
            quantity: Math.max(1, product.quantity || 1),
            price: Math.max(0, product.price || 0)
          }));

          return {
            ...order,
            orderNumber: order.orderNumber || '',
            source: order.source || '',
            deliveryMethod: order.deliveryMethod || '',
            deliveryPostNumber: order.deliveryPostNumber || '',
            phoneNumber: order.phoneNumber || '',
            fullName: order.fullName || '',
            products: validProducts,
            numberOfItems: order.numberOfItems || validProducts.reduce((sum: number, p: { quantity: number }) => sum + p.quantity, 0),
            paymentMethod: order.paymentMethod || '',
            amount: order.amount || validProducts.reduce((sum: number, p: { price: number; quantity: number }) => sum + (p.price * p.quantity), 0),
            status: order.status || '',
            currency: order.currency || '',
            created: order.created || new Date().toISOString(),
            updated: order.updated || new Date().toISOString(),
            notes: order.notes || '',
            mergeStatus: order.mergeStatus || 'none'
          } as unknown as OrdersResponse;
        })} 
      /> */}
    </ErrorBoundaryClient>
  );
}
