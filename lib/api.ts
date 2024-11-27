import pb from './pocketbase';

/**
 * Fetches all orders from the database with related information.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of order objects. Each order object includes status, payment method, delivery method, and currency information. Returns an empty array if an error occurs.
 * @throws {Error} Logs the error to console if there's an issue fetching orders.
 */
export async function fetchOrders() {
  try {
    const records = await pb.collection('orders').getFullList({
      sort: '-created',
      expand: 'deliveryMethod,paymentMethod,status,currency'
    });
    
    return records.map(record => ({
      ...record,
      id: record.id,
      createdAt: record.created,
      updatedAt: record.updated,
      currency: record.expand?.currency || {
        id: '',
        code: '',
        symbol: ''
      },
      paymentMethod: record.expand?.paymentMethod || {
        id: '',
        name: ''
      },
      status: record.expand?.status || {
        id: '',
        name: '',
        color: '#cbd5e1'
      },
      deliveryMethod: record.expand?.deliveryMethod || {
        id: '',
        name: ''
      },
      products: typeof record.products === 'string' 
        ? JSON.parse(record.products) 
        : record.products || []
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}
