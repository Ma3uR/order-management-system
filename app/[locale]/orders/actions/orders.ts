"use server"

import { validatePocketbaseResponse } from "@/app/lib/api-utils";
import pb, { authenticatedCall } from "@/app/lib/pocketbase";
import { OrdersResponse } from "@/app/types/pocketbase-types";
import { OrderFormData, orderSchema } from "@/app/lib/validations/orders";
import { DeliveryOptionsResponse, PaymentMethodsResponse, CurrencyResponse, StatusResponse, SourcesResponse } from "@/app/types/pocketbase-types";
import { Collections } from "@/app/types/pocketbase-types";
import { syncOrders } from "./sync";

// Create a type for product items
interface ProductItem {
  title?: string;
  // Add other product fields as needed
  [key: string]: unknown;
}

export const getOrders = async () => {
    try {
        console.log('🔍 [getOrders] Fetching orders with authenticated call');
        
        const orders = await authenticatedCall(() => 
            pb.collection('orders').getFullList({
                sort: '-created',
                expand: 'deliveryMethod,paymentMethod,status,currency'
            })
        );
        
        console.log(`✅ [getOrders] Successfully fetched ${orders.length} orders`);
        
        const validatedOrders = orders.map(order => validatePocketbaseResponse({
            ...order,
            mergeSource: order.mergeSource === '' ? undefined : order.mergeSource,
            mergeStatus: order.mergeStatus === '' ? undefined : order.mergeStatus,
            products: order.products?.map((p: ProductItem) => ({
                ...p,
                title: p.title || 'Untitled Product'
            }))
        }, orderSchema));
        return { error: undefined, data: validatedOrders };
    } catch (error: unknown) {
        if (error instanceof Error) {   
            console.error('❌ [getOrders] Error fetching orders:', error.message);
            return { error: `Не вдалося завантажити замовлення: ${error.message}`, data: undefined };
        }
        console.error('❌ [getOrders] Error fetching orders:', error);
        return { error: 'Невідома помилка при завантаженні замовлень', data: undefined };
    }
}

export const getOrder = async (id: string)=>{
    try {
        const order = await authenticatedCall(() => pb.collection('orders').getOne(id, {
            expand: 'status,source,currency'
        }));
        
        
        const validatedOrder = validatePocketbaseResponse({
            ...order,
            // Preserve original invoice_data if it exists
            invoice_data: order.invoice_data,
            mergeSource: order.mergeSource === '' ? undefined : order.mergeSource,
            mergeStatus: order.mergeStatus === '' ? undefined : order.mergeStatus,
            products: order.products?.map((p: ProductItem) => ({
                ...p,
                title: p.title || 'Untitled Product'
            }))
        }, orderSchema);
        
        
        return { error: undefined, data: validatedOrder };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error fetching order:', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error fetching order:', error);
        return { error: 'Unknown error in getOrder', data: undefined };
    }
}

export const createOrder = async (data: OrderFormData)=>{
    try {
        orderSchema.parse(data);
        const order = await authenticatedCall(() => pb.collection('orders').create<OrdersResponse>(data));
        const validatedOrder = validatePocketbaseResponse(order, orderSchema);
        return { error: undefined, data: validatedOrder };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in createOrder', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in createOrder', error);
        return { error: 'Unknown error in createOrder', data: undefined };
    }
}

export const updateOrder = async (id: string, data: OrderFormData) => {
    try {
        orderSchema.parse(data);
        const order = await authenticatedCall(() => pb.collection('orders').update<OrdersResponse>(id, data));
        const validatedOrder = validatePocketbaseResponse(order, orderSchema);
        return { error: undefined, data: validatedOrder };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in updateOrder', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in updateOrder', error);
        return { error: 'Unknown error in updateOrder', data: undefined };
    }
}

export const deleteOrder = async (id: string)=>{
    try {
        const deletionStatus = await authenticatedCall(() => pb.collection('orders').delete(id));
        return { error: undefined, data: deletionStatus };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in deleteOrder', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in deleteOrder', error);
        return { error: 'Unknown error in deleteOrder', data: undefined };
    }
}

export const checkDuplicateOrder = async (orderNumber: string)=>{
    try {
        const existingOrders = await pb.collection('orders').getList(1, 1, { 
            filter: `orderNumber = "${orderNumber}" && archived != true` 
        });
        return { error: undefined, data: existingOrders.totalItems > 0 };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in checkDuplicateOrder', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in checkDuplicateOrder', error);
        return { error: 'Unknown error in checkDuplicateOrder', data: undefined };
    }
}

export const getSettings = async () => {
    try {
        console.log('🔍 [getSettings] Fetching settings with authenticated call');
        
        const [
            deliveryMethods,
            paymentMethods,
            currencies,
            statuses,
            sources
        ] = await Promise.all([
            authenticatedCall(() => pb.collection('delivery_options').getFullList<DeliveryOptionsResponse>()),
            authenticatedCall(() => pb.collection('payment_options').getFullList<PaymentMethodsResponse>()),
            authenticatedCall(() => pb.collection('currency_options').getFullList<CurrencyResponse>()),
            authenticatedCall(() => pb.collection('status_options').getFullList<StatusResponse>({
                expand: 'source'
            })),
            authenticatedCall(() => pb.collection('sources').getFullList<SourcesResponse>())
        ]);

        console.log('✅ [getSettings] Successfully fetched all settings');

        const defaultCurrency = currencies.find(c => c.isDefault) || currencies[0] || {
            id: 'default',
            code: 'UAH',
            name: 'Ukrainian Hryvnia',
            symbol: '₴',
            isDefault: true,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            collectionId: 'currency_options',
            collectionName: Collections.CurrencyOptions
        } as CurrencyResponse;

        const defaultSource = sources.length === 0 ? [{
            id: 'default',
            name: 'Default',
            color: '#CBD5E1',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            collectionId: 'sources',
            collectionName: Collections.Sources
        } as SourcesResponse] : sources;

        return {
            error: undefined,
            data: {
                deliveryMethods,
                paymentMethods,
                defaultCurrency,
                statuses,
                sources: defaultSource
            }
        };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('❌ [getSettings] Error fetching settings:', error.message);
            return { error: `Помилка завантаження налаштувань: ${error.message}`, data: undefined };
        }
        console.error('❌ [getSettings] Error fetching settings:', error);
        return { error: 'Невідома помилка при завантаженні налаштувань', data: undefined };
    }
}

export const syncRozetkaOrders = async () => {
    try {
        const result = await syncOrders();
        return { error: undefined, data: result };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error syncing Rozetka orders:', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error syncing Rozetka orders:', error);
        return { error: 'Unknown error in syncRozetkaOrders', data: undefined };
    }
}

/**
 * Updates the invoice reference and data for an order
 * @param orderId The ID of the order to update
 * @param invoiceData The complete invoice data object from Nova Poshta (or null to clear it)
 * @returns The updated order record
 */
export async function updateOrderInvoice(
  orderId: string, 
  invoiceData: {
    Ref?: string;
    CostOnSite?: string;
    EstimatedDeliveryDate?: string;
    IntDocNumber?: string;
    TypeDocument?: string;
  } | null = null
) {
  try {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    // Prepare the update data object
    const updateData: Record<string, unknown> = {};
    
    // If invoice data is provided, store it in the invoice_data field
    if (invoiceData) {
      updateData.invoice_data = invoiceData;
      // Extract the invoice reference from the data if available
      if (invoiceData.Ref) {
        updateData.invoice_ref = invoiceData.Ref;
      }
    } else {
      // If clearing the invoice data, also clear the invoice reference
      updateData.invoice_data = null;
      updateData.invoice_ref = null;
    }
    
    // Update the order record with the new invoice reference and data
    const updatedOrder = await pb.collection(Collections.Orders).update(orderId, updateData);
    
    return {
      success: true,
      data: updatedOrder,
      error: null
    };
  } catch (error) {
    console.error("Failed to update order invoice reference:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}