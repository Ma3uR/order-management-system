import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { OrdersResponse, StatusResponse, CurrencyResponse, DeliveryOptionsResponse, PaymentMethodsResponse } from '@/app/types/pocketbase-types';




/**
 * Get total count of orders in the system
 */
export async function getOrdersCount() {
  try {
    console.log('🔍 [getOrdersCount] Executing with user authentication...');
    
    if (!pb.authStore.isValid) {
      throw new Error('User not authenticated');
    }
    
    const result = await pb.collection('orders').getList(1, 1, { sort: '-created' });
    console.log('✅ [getOrdersCount] result:', result.totalItems);
    return { count: result.totalItems };
  } catch (error) {
    console.error('❌ [getOrdersCount] Error getting orders count:', error);
    return { error: 'Failed to get orders count', details: String(error) };
  }
}

/**
 * Get the most recent order from the system with enhanced details
 */
export async function getLastOrder() {
  try {
    console.log('🔍 [getLastOrder] Executing with user authentication...');
    
    if (!pb.authStore.isValid) {
      throw new Error('User not authenticated');
    }
    
    const orders = await pb.collection('orders').getList<OrdersResponse<unknown, {
      status: StatusResponse,
      currency: CurrencyResponse,
      paymentMethod: PaymentMethodsResponse,
      deliveryMethod: DeliveryOptionsResponse
    }>>(1, 1, { 
      sort: '-created',
      expand: 'status,currency,paymentMethod,deliveryMethod',
      fields: 'id,created,orderNumber,fullName,phoneNumber,status,currency,paymentMethod,deliveryMethod,amount,products,numberOfItems,expand'
    });
    
    if (orders.items.length === 0) {
      console.log('❌ [getLastOrder] No orders found');
      return { message: 'No orders found' };
    }
    
    // Get the raw order data
    const order = orders.items[0];
    console.log('✅ [getLastOrder] Last order found:', order.id);
    
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
    console.error('❌ [getLastOrder] Error getting last order:', error);
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

/**
 * Get orders with a specific status
 */
export async function getOrdersByStatus(status: string) {
  try {
    console.log(`Executing getOrdersByStatus with status: ${status}...`);
    
    if (!status) {
      console.log('Status is missing');
      return { error: 'Status is required' };
    }
    
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 20, { 
        filter: `status.name ~ "${status}"`,
        expand: 'status',
        sort: '-created'
      })
    );
    
    console.log(`Found ${orders.totalItems} orders with status ${status}`);
    
    if (orders.totalItems === 0) {
      return { message: `No orders found with status ${status}` };
    }
    
    return {
      count: orders.totalItems,
      orders: orders.items.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.created,
        customer: order.fullName,
        phoneNumber: order.phoneNumber,
        total: order.amount || 0
      }))
    };
  } catch (error) {
    console.error(`Error getting orders with status ${status}:`, error);
    return { error: 'Failed to get orders by status', details: String(error) };
  }
}

/**
 * Calculate income minus expenses for a specific period
 */
export async function calculateBalanceForPeriod(startDate: string, endDate: string) {
  try {
    console.log(`Calculating balance for period: ${startDate} to ${endDate}...`);
    
    if (!startDate || !endDate) {
      return { error: 'Both start date and end date are required' };
    }
    
    // Get income from completed orders
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 1000, { 
        filter: `created >= "${startDate}" && created <= "${endDate}" && status.name = "completed"`,
        fields: 'id,amount,orderNumber'
      })
    );
    
    // Get expenses from expenses collection
    const expenses = await authenticatedCall(() => 
      pb.collection('expenses').getList(1, 1000, { 
        filter: `date >= "${startDate}" && date <= "${endDate}"`,
        fields: 'id,amount,description,date,category'
      })
    );
    
    const totalIncome = orders.items.reduce((sum, order) => sum + (order.amount || 0), 0);
    const totalExpenses = expenses.items.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const balance = totalIncome - totalExpenses;
    
    // Group expenses by category
    const expensesByCategory: Record<string, number> = {};
    for (const expense of expenses.items) {
      const category = expense.category || 'Uncategorized';
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = 0;
      }
      expensesByCategory[category] += expense.amount || 0;
    }
    
    return {
      period: {
        start: startDate,
        end: endDate
      },
      income: {
        total: totalIncome,
        ordersCount: orders.totalItems
      },
      expenses: {
        total: totalExpenses,
        count: expenses.totalItems,
        byCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
          category,
          amount
        }))
      },
      balance: balance
    };
  } catch (error) {
    console.error(`Error calculating balance for period ${startDate} to ${endDate}:`, error);
    return { error: 'Failed to calculate balance', details: String(error) };
  }
}
/**
 * Get most popular products by order count
 */
export async function getTopProductsByPopularity(startDate: string, endDate: string, limit: number = 10) {
  try {
    console.log(`Getting top ${limit} popular products for period: ${startDate} to ${endDate}...`);
    
    // Get all orders with products
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 1000, { 
        filter: `created >= "${startDate}" && created <= "${endDate}"`,
        fields: 'products'
      })
    );
    
    // Count product occurrences
    const productCounts: Record<string, { name: string, count: number }> = {};
    
    for (const order of orders.items) {
      if (Array.isArray(order.products)) {
        for (const product of order.products) {
          const productName = product.name || product.title || product.productName || product.product_name || 'Unnamed product';
          const productId = product.id || product.productId || productName;
          
          if (!productCounts[productId]) {
            productCounts[productId] = { name: productName, count: 0 };
          }
          
          productCounts[productId].count += product.quantity || product.qty || product.amount || 1;
        }
      }
    }
    
    // Convert to array and sort
    const sortedProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return {
      topProducts: sortedProducts
    };
  } catch (error) {
    console.error(`Error getting top products:`, error);
    return { error: 'Failed to get top products', details: String(error) };
  }
}

/**
 * Get least popular products by order count
 */
export async function getLeastPopularProducts(startDate: string, endDate: string, limit: number = 10) {
  try {
    console.log(`Getting ${limit} least popular products for period: ${startDate} to ${endDate}...`);
    
    // Get all orders with products
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 1000, { 
        filter: `created >= "${startDate}" && created <= "${endDate}"`,
        fields: 'products'
      })
    );
    
    // Count product occurrences
    const productCounts: Record<string, { name: string, count: number }> = {};
    
    for (const order of orders.items) {
      if (Array.isArray(order.products)) {
        for (const product of order.products) {
          const productName = product.name || product.title || product.productName || product.product_name || 'Unnamed product';
          const productId = product.id || product.productId || productName;
          
          if (!productCounts[productId]) {
            productCounts[productId] = { name: productName, count: 0 };
          }
          
          productCounts[productId].count += product.quantity || product.qty || product.amount || 1;
        }
      }
    }
    
    // Convert to array and sort (ascending)
    const sortedProducts = Object.values(productCounts)
      .sort((a, b) => a.count - b.count)
      .slice(0, limit);
    
    return {
      leastPopularProducts: sortedProducts
    };
  } catch (error) {
    console.error(`Error getting least popular products:`, error);
    return { error: 'Failed to get least popular products', details: String(error) };
  }
}

/**
 * Calculate average order value for a specific period
 */
export async function calculateAverageOrderValue(startDate: string, endDate: string, source?: string) {
  try {
    console.log(`Calculating average order value for period: ${startDate} to ${endDate}...`);
    
    if (!startDate || !endDate) {
      return { error: 'Both start date and end date are required' };
    }
    
    // Get orders for the period
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 1000, { 
        filter: `created >= "${startDate}" && created <= "${endDate}"${source ? ` && source.name = "${source}"` : ''}`,
        fields: 'amount'
      })
    );
    
    if (orders.totalItems === 0) {
      return { 
        period: { start: startDate, end: endDate },
        averageValue: 0,
        ordersCount: 0,
        message: 'No orders found for the specified period' 
      };
    }
    
    const totalAmount = orders.items.reduce((sum, order) => sum + (order.amount || 0), 0);
    const averageValue = totalAmount / orders.totalItems;
    
    return {
      period: {
        start: startDate,
        end: endDate
      },
      averageValue: averageValue,
      ordersCount: orders.totalItems,
      totalAmount: totalAmount
    };
  } catch (error) {
    console.error(`Error calculating average order value:`, error);
    return { error: 'Failed to calculate average order value', details: String(error) };
  }
}

/**
 * Get orders with "being assembled" status and count required products
 */
export async function getOrdersBeingAssembled() {
  try {
    console.log('Getting orders being assembled...');
    
    // Get orders with "being assembled" status
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 100, { 
        filter: `(status = "oni6s9oxdnlimzt" || status = "oivyo1td64r4qsd" || status = "0a3jmekr5xi0xqt" || status = "kw542bs057znpp7") && (archived = false || archived = null)`,
        expand: 'status',
        fields: 'id,orderNumber,created,fullName,phoneNumber,products'
      })
    );
    
    console.log(`Found ${orders.totalItems} orders being assembled`);
    
    if (orders.totalItems === 0) {
      return { message: 'No orders found with "Комплектується" status' };
    }
    
    // Aggregate product counts across all orders
    const productCounts: Record<string, { name: string, quantity: number }> = {};
    
    for (const order of orders.items) {
      if (Array.isArray(order.products)) {
        for (const product of order.products) {
          const productName = product.name || product.title || product.productName || product.product_name || 'Unnamed product';
          
          if (!productCounts[productName]) {
            productCounts[productName] = { name: productName, quantity: 0 };
          }
          
          productCounts[productName].quantity += product.quantity || product.qty || product.amount || 1;
        }
      }
    }
    
    return {
      count: orders.totalItems,
      orders: orders.items.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.created,
        customer: order.fullName,
        phoneNumber: order.phoneNumber
      })),
      productsNeeded: Object.values(productCounts).sort((a, b) => b.quantity - a.quantity)
    };
  } catch (error) {
    console.error('Error getting orders being assembled:', error);
    return { error: 'Failed to get orders being assembled', details: String(error) };
  }
}