"use server";

import pb, { authenticatedCall } from "../../../lib/pocketbase";
import { DeliveryOptionsResponse, OrdersResponse } from "../../../types/pocketbase-types";
import { DeliveryMethodFormData, deliveryMethodSchema, deliveryMethodUpdateSchema, type DeliveryMethodUpdateData } from "../../../lib/validations/settings";
import { validatePocketbaseResponse } from "../../../lib/api-utils";

export const getAllDeliveryMethods = async ()=>{
    try {
        const deliveryMethods = await authenticatedCall(() => pb.collection('delivery_options').getFullList<DeliveryOptionsResponse>({sort: '-created'}));
        const validatedMethods = deliveryMethods.map(method => validatePocketbaseResponse(method, deliveryMethodSchema));
        return { error: undefined, data: validatedMethods };
    } catch (error:unknown) {
        if (error instanceof Error) {
            console.error('Error in getAllDeliveryMethods:', error);
            return { data: undefined, error: 'Failed to fetch delivery methods' };
        }
        console.error('Error in getAllDeliveryMethods:', error);
        return { data: undefined, error: 'Unknown error in getAllDeliveryMethods' };
    }
}

export const createDeliveryMethod = async (data:DeliveryMethodFormData)=>{
    try {
        deliveryMethodSchema.parse(data);
        const deliveryMethod = await authenticatedCall(() => pb.collection('delivery_options').create<DeliveryOptionsResponse>(data));
        const validatedMethod = validatePocketbaseResponse(deliveryMethod, deliveryMethodSchema);
        return { error: undefined, data: validatedMethod };
    } catch (error:unknown) {
        if (error instanceof Error) {
            console.error('Error in createDeliveryMethod:', error);
            return { data: undefined, error: 'Failed to create delivery method' };
        }
        console.error('Error in createDeliveryMethod:', error);
        return { data: undefined, error: 'Unknown error in createDeliveryMethod' };
    }
}

export const updateDeliveryMethod = async (data: DeliveryMethodUpdateData) => {
    try {
        deliveryMethodUpdateSchema.parse(data);
        const deliveryMethod = await authenticatedCall(() => 
            pb.collection('delivery_options').update<DeliveryOptionsResponse>(data.id, data)
        );
        const validatedMethod = validatePocketbaseResponse(deliveryMethod, deliveryMethodSchema);
        return { error: undefined, data: validatedMethod };
    } catch (error:unknown) {
        if (error instanceof Error) {
            console.error('Error in updateDeliveryMethod:', error);
            return { data: undefined, error: 'Failed to update delivery method' };
        }
        console.error('Error in updateDeliveryMethod:', error);
        return { data: undefined, error: 'Unknown error in updateDeliveryMethod' };
    }
}
    
export const deleteDeliveryMethod = async (id: string) => {
    try {
        const orders = await authenticatedCall(() => 
            pb.collection('orders').getList<OrdersResponse>(1, 1, {
                filter: `deliveryMethod = "${id}"`,
            })
        );
        if (orders.totalItems > 0) {
            throw new Error('Cannot delete delivery method that is being used in orders');
        }
        const deletionStatus = await authenticatedCall(() => pb.collection('delivery_options').delete(id));
        return { error: undefined, data: deletionStatus };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in deleteDeliveryMethod', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in deleteDeliveryMethod', error);
        return { error: 'Unknown error in deleteDeliveryMethod', data: undefined };
    }
}