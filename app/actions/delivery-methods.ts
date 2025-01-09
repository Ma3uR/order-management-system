"use server";

import pb, { authenticatedCall } from "../lib/pocketbase";
import { DeliveryOptionsResponse } from "../types/pocketbase-types";
import { deliveryMethodSchema } from "../lib/validations/settings";
import { z } from "zod";

export async function getAllDeliveryMethods(): Promise<{
    error: string | undefined;
    data: DeliveryOptionsResponse[] | undefined;
}> {
    try {
        const deliveryMethods = await authenticatedCall(() => pb.collection('delivery_options').getFullList<DeliveryOptionsResponse>({
            sort: '-created',
        }));
        return { error: undefined, data: deliveryMethods };
    } catch (error: unknown) {
        console.error('Error in getAllDeliveryMethods', error);
        return { error: 'Unknown error in getAllDeliveryMethods', data: undefined };
    }
}

export async function createDeliveryMethod(data: unknown): Promise<{
    error: string | undefined;
    data: DeliveryOptionsResponse | undefined;
}> {
    try {
        const validatedData = deliveryMethodSchema.parse(data);
        
        const deliveryMethod = await authenticatedCall(() => 
            pb.collection('delivery_options').create<DeliveryOptionsResponse>(validatedData)
        );
        return { error: undefined, data: deliveryMethod };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.errors[0].message, data: undefined };
        }
        if (error instanceof Error) {
            console.error('Error in createDeliveryMethod', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in createDeliveryMethod', error);
        return { error: 'Unknown error in createDeliveryMethod', data: undefined };
    }
}

export async function updateDeliveryMethod(id: string, data: Record<string, unknown>): Promise<{
    error: string | undefined;
    data: DeliveryOptionsResponse | undefined;
}> {
    try {
        const deliveryMethod = await authenticatedCall(() => pb.collection('delivery_options').update<DeliveryOptionsResponse>(id, data));
        return { error: undefined, data: deliveryMethod };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in updateDeliveryMethod', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in updateDeliveryMethod', error);
        return { error: 'Unknown error in updateDeliveryMethod', data: undefined };
    }
}

export async function deleteDeliveryMethod(id: string): Promise<{
    error: string | undefined;
    data: boolean | undefined;
}> {
    try {
        const deliveryMethod = await authenticatedCall(() => pb.collection('delivery_options').delete(id));
        return { error: undefined, data: deliveryMethod };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in deleteDeliveryMethod', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in deleteDeliveryMethod', error);
        return { error: 'Unknown error in deleteDeliveryMethod', data: undefined };
    }
}