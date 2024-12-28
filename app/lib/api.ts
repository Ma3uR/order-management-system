import pb from './pocketbase';

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PocketBaseRecord {
  id: string;
  created: string;
  updated: string;
  orderNumber: string;
  source: string;
  deliveryMethod: string;
  deliveryPostNumber: string;
  phoneNumber: string;
  fullName: string;
  products: string | Product[];
  numberOfItems: number;
  paymentMethod: string;
  amount: number;
  status: string;
  currency: string;
  notes?: string;
  expand?: {
    deliveryMethod?: { id: string; name: string };
    paymentMethod?: { id: string; name: string };
    status?: { id: string; name: string; color: string };
    currency?: { id: string; code: string; symbol: string };
  };
}

export async function fetchOrders() {
  try {
    const records = await pb.collection('orders').getFullList<PocketBaseRecord>({
      sort: '-created',
      expand: 'deliveryMethod,paymentMethod,status,currency'
    });
    
    return records.map(record => ({
      id: record.id,
      orderNumber: record.orderNumber || '',
      source: record.source || '',
      deliveryMethod: {
        id: record.expand?.deliveryMethod?.id || '',
        name: record.expand?.deliveryMethod?.name || ''
      },
      deliveryPostNumber: record.deliveryPostNumber || '',
      phoneNumber: record.phoneNumber || '',
      fullName: record.fullName || '',
      products: typeof record.products === 'string' 
        ? JSON.parse(record.products) 
        : record.products || [],
      numberOfItems: record.numberOfItems || 0,
      paymentMethod: {
        id: record.expand?.paymentMethod?.id || '',
        name: record.expand?.paymentMethod?.name || ''
      },
      amount: record.amount || 0,
      status: record.expand?.status ? {
        id: record.expand.status.id,
        name: record.expand.status.name,
        color: record.expand.status.color
      } : {
        id: '',
        name: '',
        color: '#cbd5e1'
      },
      currency: {
        id: record.expand?.currency?.id || '',
        code: record.expand?.currency?.code || '',
        symbol: record.expand?.currency?.symbol || ''
      },
      createdAt: record.created ? new Date(record.created).toISOString() : new Date().toISOString(),
      updatedAt: record.updated ? new Date(record.updated).toISOString() : new Date().toISOString(),
      productsText: typeof record.products === 'string' 
        ? record.products 
        : JSON.stringify(record.products || [], null, 2),
      notes: record.notes || ''
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}
