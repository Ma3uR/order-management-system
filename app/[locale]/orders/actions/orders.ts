"use server"

import { validatePocketbaseResponse } from "@/app/lib/api-utils";
import pb, { authenticatedCall } from "@/app/lib/pocketbase";
import { OrdersResponse } from "@/app/types/pocketbase-types";
import { OrderFormData, orderSchema } from "@/app/lib/validations/orders";
import { DeliveryOptionsResponse, PaymentMethodsResponse, CurrencyResponse, StatusResponse, SourcesResponse } from "@/app/types/pocketbase-types";
import { Collections } from "@/app/types/pocketbase-types";
import { syncOrders } from "./sync";

export const getOrders = async () => {
    try {
        const orders = await authenticatedCall(() => pb.collection('orders').getFullList({
            sort: '-created',
            expand: 'deliveryMethod,paymentMethod,status,currency'
        }));
        const validatedOrders = orders.map(order => validatePocketbaseResponse(order, orderSchema));
        return { error: undefined, data: validatedOrders };
    } catch (error: unknown) {
        if (error instanceof Error) {   
            console.error('Error fetching orders:', error.message);
            return { error: error.message, data: undefined };
        }
        console.error('Error fetching orders:', error);
        return { error: 'Unknown error in getOrders', data: undefined };
    }
}

export const getOrder = async (id: string)=>{
    try {
        const order = await authenticatedCall(() => pb.collection('orders').getOne(id));
        const validatedOrder = validatePocketbaseResponse(order, orderSchema);
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

export const updateOrder = async (id: string, data: OrderFormData)=>{
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
        const existingOrders = await pb.collection('orders').getList(1, 1, { filter: `orderNumber = "${orderNumber}"` });
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
            authenticatedCall(() => pb.collection('status_options').getFullList<StatusResponse>()),
            authenticatedCall(() => pb.collection('sources').getFullList<SourcesResponse>())
        ]);

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
            console.error('Error fetching settings:', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error fetching settings:', error);
        return { error: 'Unknown error in getSettings', data: undefined };
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