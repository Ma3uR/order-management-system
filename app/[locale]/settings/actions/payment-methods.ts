"use server";

import { validatePocketbaseResponse } from "../../../lib/api-utils";
import pb from "../../../lib/pocketbase";
import { authenticatedCall } from "../../../lib/pocketbase";
import { PaymentMethodFormData, paymentMethodSchema, PaymentMethodUpdateData } from "../../../lib/validations/settings";
import { OrdersResponse, PaymentMethodsResponse } from "../../../types/pocketbase-types";

export const getAllPaymentMethods = async ()=>{
    try {
        const paymentMethods = await authenticatedCall(() => pb.collection('payment_options').getFullList<PaymentMethodsResponse>({
            sort: '-created',
        }));
        const validatedMethods = paymentMethods.map(method => validatePocketbaseResponse(method, paymentMethodSchema));
        return {
            error: undefined,
            data: validatedMethods,
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in getAllPaymentMethods', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in getAll11PaymentMethods', error);
        return { error: 'Unknown error in getAllPaymentMethods', data: undefined };
    }
}

export const createPaymentMethod = async (data: PaymentMethodFormData)=>{
    try {
        paymentMethodSchema.parse(data);    
        const paymentMethod = await authenticatedCall(() => pb.collection('payment_options').create<PaymentMethodsResponse>(data));
        const validatedMethod = validatePocketbaseResponse(paymentMethod, paymentMethodSchema);
        return { error: undefined, data: validatedMethod };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.log('payment method data', data);
            console.error('Error in createPaymentMethod', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in createPaymentMethod', error);
        return { error: 'Unknown error in createPaymentMethod', data: undefined };
    }
}

export const updatePaymentMethod = async (data: PaymentMethodUpdateData)=>{
    try {
        paymentMethodSchema.parse(data);
        const paymentMethod = await authenticatedCall(() => pb.collection('payment_options').update<PaymentMethodsResponse>(data.id, data));
        const validatedMethod = validatePocketbaseResponse(paymentMethod, paymentMethodSchema);
        return { error: undefined, data: validatedMethod };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in updatePaymentMethod', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in updatePaymentMethod', error);
        return { error: 'Unknown error in updatePaymentMethod', data: undefined };
    }
}

export const deletePaymentMethod = async (data: { id: string })=>{
    try {
        const orders = await authenticatedCall(() => 
            pb.collection('orders').getList<OrdersResponse>(1, 1, {
                filter: `paymentMethod = "${data.id}"`,
            })
        );
        if (orders.totalItems > 0) {
            throw new Error('Cannot delete payment method that is being used in orders');
        }
        const deletionStatus = await authenticatedCall(() => pb.collection('payment_options').delete(data.id));
        return { error: undefined, data: deletionStatus };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in deletePaymentMethod', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in deletePaymentMethod', error);
        return { error: 'Unknown error in deletePaymentMethod', data: undefined };
    }
}