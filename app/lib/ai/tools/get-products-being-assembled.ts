import { z } from 'zod';
import { ToolDefinition } from './types';
import { getOrdersBeingAssembled } from '@/app/lib/services/orders';

interface OrderWithProducts {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: string;
  phoneNumber: string;
  source?: string;
  status?: string;
  products: Array<{ name: string; quantity: number; price?: number }>;
}

interface ProductAggregate {
  name: string;
  quantity: number;
}

interface ToolResponse {
  ordersCount: number;
  orders: OrderWithProducts[];
  productsCount: number;
  products: ProductAggregate[];
}

export const getProductsBeingAssembled: ToolDefinition<Record<string, never>, ToolResponse | { error: string; details?: string } | { message: string }> = {
  description: 'Get all products from orders with status "being assembled" (комплектуються) with quantity totals and full order details',
  parameters: z.object({}),
  execute: async () => {
    const result = await getOrdersBeingAssembled();
    
    // If there's an error or no orders found, return the result as is
    if (result.error || result.message) {
      return result;
    }
    
    // We need to re-fetch orders with product details since the service doesn't return them
    try {
      const pb = (await import('@/app/lib/pocketbase')).default;
      
      // First, fetch all sources and statuses to create mappings
      const allSources = await pb.collection('sources').getFullList();
      const sourceMap = new Map(allSources.map(s => [s.id, s.name]));
      
      const allStatuses = await pb.collection('status_options').getFullList();
      const statusMap = new Map(allStatuses.map(s => [s.id, s.name]));
      
      const ordersWithProducts = await pb.collection('orders').getList(1, 100, { 
        filter: `(status = "oivyo1td64r4qsd" || status = "0a3jmekr5xi0xqt" || status = "kw542bs057znpp7") && (archived = false || archived = null)`,
        expand: 'source,status'
      });

      // Transform orders to include product details
      const orders: OrderWithProducts[] = ordersWithProducts.items.map(order => {
        // Get the source name - could be from expand or direct fields
        let sourceName = 'Unknown';
        
        if (order.expand?.source?.name) {
          sourceName = order.expand.source.name;
        } else if (order.source) {
          // Use the source map to get the name
          sourceName = sourceMap.get(order.source) || 'Unknown';
        }
        
        // Get the status name
        let statusName = '';
        if (order.expand?.status?.name) {
          statusName = order.expand.status.name;
        } else if (order.status) {
          // Use the status map to get the name
          statusName = statusMap.get(order.status) || '';
          
          // If still no name, try to get a hardcoded mapping for known status IDs
          if (!statusName) {
            const knownStatuses: Record<string, string> = {
              'oivyo1td64r4qsd': 'Комплектується',
              '0a3jmekr5xi0xqt': 'Готовий до відправки',
              'kw542bs057znpp7': 'В збірці'
            };
            statusName = knownStatuses[order.status] || '';
          }
        }
        
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.created,
          customer: order.fullName || 'Not specified',
          phoneNumber: order.phoneNumber || 'Not specified',
          source: sourceName,
          status: statusName || undefined,
          products: Array.isArray(order.products) ? order.products.map(product => ({
            name: product.name || product.title || product.productName || product.product_name || 'Unnamed product',
            quantity: product.quantity || product.qty || product.amount || 1,
            price: product.price || product.cost || product.value
          })) : []
        };
      });

      return {
        ordersCount: result.count || 0,
        orders,
        productsCount: result.productsNeeded?.length || 0,
        products: result.productsNeeded || []
      };
    } catch (error) {
      console.error('❌ [getProductsBeingAssembled] Error fetching order details:', error);
      return { error: 'Failed to fetch order details', details: String(error) };
    }
  },
}; 