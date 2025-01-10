"use server";

import { validatePocketbaseResponse } from "../../../lib/api-utils";
import pb, { authenticatedCall } from "../../../lib/pocketbase";
import { currencySchema } from "../../../lib/validations/settings";
import { CurrencyResponse } from "../../../types/pocketbase-types";

export const getAllCurrencies = async ()=>{
    try {
        const currencies = await authenticatedCall(() => pb.collection('currencies').getFullList<CurrencyResponse>({
            sort: '-created',
        }));
        const validatedCurrencies = currencies.map(currency => validatePocketbaseResponse(currency, currencySchema));
        return { error: undefined, data: validatedCurrencies };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in getAllCurrencies', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in getAllCurrencies', error);
        return { error: 'Unknown error in getAllCurrencies', data: undefined };
    }
}

export const createCurrency = async (data: Record<string, unknown>)=>{
    try {
        currencySchema.parse(data);
        const currency = await authenticatedCall(() => pb.collection('currencies').create<CurrencyResponse>(data));
        const validatedCurrency = validatePocketbaseResponse(currency, currencySchema);
        return { error: undefined, data: validatedCurrency };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in createCurrency', error.message);
            return { error: error.message, data: undefined, };
        }
        console.error('Error in createCurrency', error);
        return { error: 'Unknown error in createCurrency', data: undefined };
    }
}

export const updateCurrency = async (id: string, data: Record<string, unknown>)=>{
    try {
        currencySchema.parse(data);
        const currency = await authenticatedCall(() => pb.collection('currencies').update<CurrencyResponse>(id, data));
        const validatedCurrency = validatePocketbaseResponse(currency, currencySchema);
        return { error: undefined, data: validatedCurrency };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in updateCurrency', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in updateCurrency', error);
        return { error: 'Unknown error in updateCurrency', data: undefined };
    }
}

export const deleteCurrency = async (id: string)=>{
    try {
        const deletionStatus = await authenticatedCall(() => pb.collection('currencies').delete(id));
        return { error: undefined, data: deletionStatus };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in deleteCurrency', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in deleteCurrency', error);
        return { error: 'Unknown error in deleteCurrency', data: undefined };
    }
}

export const getDefaultCurrency = async ()=>{
    try {
        const currency = await authenticatedCall(() => pb.collection('currency_options').getFirstListItem('isDefault=true'));
        const validatedCurrency = validatePocketbaseResponse(currency, currencySchema);
        return { error: undefined, data: validatedCurrency };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in getDefaultCurrency', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in getDefaultCurrency', error);
        return { error: 'Unknown error in getDefaultCurrency', data: undefined };
    }
}