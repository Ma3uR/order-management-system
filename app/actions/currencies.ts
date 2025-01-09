"use server";

import pb, { authenticatedCall } from "../lib/pocketbase";
import { CurrencyResponse } from "../types/pocketbase-types";

export async function getAllCurrencies(): Promise<{
    error: string | undefined;
    data: CurrencyResponse[] | undefined;
}> {
    const currencies = await authenticatedCall(() => pb.collection('currencies').getFullList<CurrencyResponse>({
        sort: '-created',
    }));
    return { error: undefined, data: currencies };
}

export async function createCurrency(data: Record<string, unknown>): Promise<{
    error: string | undefined;
    data: CurrencyResponse | undefined;
}> {
    try {
        const currency = await authenticatedCall(() => pb.collection('currencies').create<CurrencyResponse>(data));
        return { error: undefined, data: currency };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in createCurrency', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in createCurrency', error);
        return { error: 'Unknown error in createCurrency', data: undefined };
    }
}

export async function updateCurrency(id: string, data: Record<string, unknown>): Promise<{
    error: string | undefined;
    data: CurrencyResponse | undefined;
}> {
    try {
        const currency = await authenticatedCall(() => pb.collection('currencies').update<CurrencyResponse>(id, data));
        return { error: undefined, data: currency };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in updateCurrency', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in updateCurrency', error);
        return { error: 'Unknown error in updateCurrency', data: undefined };
    }
}

export async function deleteCurrency(id: string): Promise<{
    error: string | undefined;
    data: boolean | undefined;
}> {
    try {
        const currency = await authenticatedCall(() => pb.collection('currencies').delete(id));
        return { error: undefined, data: currency };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in deleteCurrency', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in deleteCurrency', error);
        return { error: 'Unknown error in deleteCurrency', data: undefined };
    }
}

export async function getDefaultCurrency(): Promise<{
    error: string | undefined;
    data: CurrencyResponse | undefined;
}> {
    try {
        const currency = await authenticatedCall(() => pb.collection('currency_options').getFirstListItem('isDefault=true'));
        return { error: undefined, data: currency as CurrencyResponse };
    } catch (error: unknown) {
        console.error('Error in getDefaultCurrency', error);
        return { error: 'Unknown error in getDefaultCurrency', data: undefined };
    }
}