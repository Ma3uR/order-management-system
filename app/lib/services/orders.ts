import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { OrdersResponse, StatusResponse, CurrencyResponse, DeliveryOptionsResponse, PaymentMethodsResponse } from '@/app/types/pocketbase-types';

/**
 * Get total count of orders in the system
 */
export async function getOrdersCount() {
  try {
    console.log('Executing getOrdersCount...');
    const result = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 1, { sort: '-created' })
    );
    console.log('getOrdersCount result:', result.totalItems);
    return { count: result.totalItems };
  } catch (error) {
    console.error('Error getting orders count:', error);
    return { error: 'Failed to get orders count', details: String(error) };
  }
}

/**
 * Get the most recent order from the system with enhanced details
 */
export async function getLastOrder() {
  try {
    console.log('Executing getLastOrder...');
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList<OrdersResponse<unknown, {
        status: StatusResponse,
        currency: CurrencyResponse,
        paymentMethod: PaymentMethodsResponse,
        deliveryMethod: DeliveryOptionsResponse
      }>>(1, 1, { 
        sort: '-created',
        expand: 'status,currency,paymentMethod,deliveryMethod',
        fields: 'id,created,orderNumber,fullName,phoneNumber,status,currency,paymentMethod,deliveryMethod,amount,products,numberOfItems,expand'
      })
    );
    
    if (orders.items.length === 0) {
      console.log('No orders found');
      return { message: 'No orders found' };
    }
    
    // Get the raw order data
    const order = orders.items[0];
    console.log('Last order found:', order.id);
    console.log('Order:', order);
    
    // Get expanded data
    const statusName = order.expand?.status?.name || 'Not specified';
    const currencyCode = order.expand?.currency?.code || 'Not specified';
    const currencySymbol = order.expand?.currency?.symbol || '';
    const paymentMethodName = order.expand?.paymentMethod?.name || 'Not specified';
    const deliveryMethodName = order.expand?.deliveryMethod?.name || 'Not specified';
    
    // Format customer information
    const customerInfo = order.fullName 
      ? `${order.fullName} (${order.phoneNumber})` 
      : 'Not available';
    
    // Format items information if available
    let itemsInfo: Array<{name: string, quantity: number, price: number}> = [];
    if (Array.isArray(order.products) && order.products.length > 0) {
      // Add debug logging to see the structure of the first product
      console.log('Product data structure:', JSON.stringify(order.products[0], null, 2));
      
      itemsInfo = order.products.map(item => ({
        name: item.name || item.title || item.productName || item.product_name || 'Unnamed product',
        quantity: item.quantity || item.qty || item.amount || 1,
        price: item.price || item.cost || item.value || 0
      }));
    }
    
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.created,
      statusName: statusName,
      customer: customerInfo,
      total: order.amount || 0,
      currencyCode: currencyCode,
      currencySymbol: currencySymbol,
      paymentMethod: paymentMethodName,
      deliveryMethod: deliveryMethodName,
      itemsCount: order.numberOfItems || 0,
      items: itemsInfo
    };
  } catch (error) {
    console.error('Error getting last order:', error);
    return { error: 'Failed to get last order', details: String(error) };
  }
}

/**
 * Get orders by customer phone number 
 */
export async function getOrdersByPhone(phoneNumber: string) {
  try {
    console.log(`Executing getOrdersByPhone with number: ${phoneNumber}...`);
    
    if (!phoneNumber) {
      console.log('Phone number is missing');
      return { error: 'Phone number is required' };
    }
    
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 10, { 
        filter: `phoneNumber ~ "${phoneNumber}"`,
        sort: '-created'
      })
    );
    
    console.log(`Found ${orders.totalItems} orders for phone ${phoneNumber}`);
    
    if (orders.totalItems === 0) {
      return { message: `No orders found for phone number ${phoneNumber}` };
    }
    
    // Return simplified versions of the orders
    return {
      count: orders.totalItems,
      orders: orders.items.map(order => ({
        id: order.id,
        createdAt: order.created,
        status: order.status,
        customer: order.customer,
        total: order.total
      }))
    };
  } catch (error) {
    console.error(`Error getting orders for phone ${phoneNumber}:`, error);
    return { error: 'Failed to get orders by phone', details: String(error) };
  }
} 