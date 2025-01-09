"use server";

import pb from "../lib/pocketbase";
import { authenticatedCall } from "../lib/pocketbase";
import { PaymentMethodsResponse } from "../types/pocketbase-types";

export async function getAllPaymentMethods(): Promise<{
    error: string | undefined;
    data: PaymentMethodsResponse[] | undefined;
}> {
    try {
        const response = await authenticatedCall(() => pb.collection('payment_options').getFullList<PaymentMethodsResponse>({
            sort: '-created',
        }));
        return {
            error: undefined,
            data: response,
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in getAllPaymentMethods', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in getAllPaymentMethods', error);
        return { error: 'Unknown error in getAllPaymentMethods', data: undefined };
    }
}

export async function createPaymentMethod(data: Record<string, unknown>): Promise<{
    error: string | undefined;
    data: PaymentMethodsResponse | undefined;
}> {
    try {
        const paymentMethod = await authenticatedCall(() => pb.collection('payment_options').create<PaymentMethodsResponse>(data));
        return { error: undefined, data: paymentMethod };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in createPaymentMethod', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in createPaymentMethod', error);
        return { error: 'Unknown error in createPaymentMethod', data: undefined };
    }
}

export async function updatePaymentMethod(id: string, data: Record<string, unknown>): Promise<{
    error: string | undefined;
    data: PaymentMethodsResponse | undefined;
}> {
    try {
        const paymentMethod = await authenticatedCall(() => pb.collection('payment_options').update<PaymentMethodsResponse>(id, data));
        return { error: undefined, data: paymentMethod };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in updatePaymentMethod', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in updatePaymentMethod', error);
        return { error: 'Unknown error in updatePaymentMethod', data: undefined };
    }
}

export async function deletePaymentMethod(id: string): Promise<{
    error: string | undefined;
    data: boolean | undefined;
}> {
    try {
        const status = await authenticatedCall(() => pb.collection('payment_options').delete(id));
        return { error: undefined, data: status };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in deletePaymentMethod', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in deletePaymentMethod', error);
        return { error: 'Unknown error in deletePaymentMethod', data: undefined };
    }
}