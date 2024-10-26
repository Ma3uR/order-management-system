import {getTranslations} from 'next-intl/server';
import OrdersManagement from '@/components/OrdersManagement';
import { fetchOrders } from '@/lib/api'; // We'll create this file next

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
  };

  return (
    <OrdersManagement 
      translations={translations} 
      initialOrders={orders.map(order => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        products: JSON.stringify(order.products)
      }))} 
    />
  );
}
