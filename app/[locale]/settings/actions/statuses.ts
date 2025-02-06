"use server";

import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { OrdersResponse, StatusResponse } from '@/app/types/pocketbase-types';
import { StatusFormData, statusSchema } from '@/app/lib/validations/settings';
import { validatePocketbaseResponse } from '../../../lib/api-utils';

export const getAllStatuses = async ()=>{
    try {
        const statuses = await authenticatedCall(() => pb.collection('status_options').getFullList<StatusResponse>({
            sort: '-created',
        }));
        const validatedStatuses = statuses.map(status => validatePocketbaseResponse(status, statusSchema));
        return {
            error: undefined,
            data: validatedStatuses,
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in getAllStatuses', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in getAllStatuses', error);
        return { error: 'Unknown error in getAllStatuses', data: undefined };
    }
}

export const createStatus = async (data: StatusFormData)=>{
    try {
        statusSchema.parse(data);
        const status = await authenticatedCall(() => pb.collection('status_options').create<StatusResponse>(data));
        const validatedStatus = validatePocketbaseResponse(status, statusSchema);
        return { error: undefined, data: validatedStatus };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in createStatus', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in createStatus', error);
        return { error: 'Unknown error in createStatus', data: undefined };
    }
}

export const deleteStatus = async (id: string)=>{
    try {
        const orders = await authenticatedCall(() => 
            pb.collection('orders').getList<OrdersResponse>(1, 1, {
                filter: `status = "${id}"`,
            })
        );
        if (orders.totalItems > 0) {
            throw new Error('Cannot delete status that is being used in orders');
        }
        const deletionStatus = await authenticatedCall(() => pb.collection('status_options').delete(id));
        return { error: undefined, data: deletionStatus };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in deleteStatus', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in deleteStatus', error);
        return { error: 'Unknown error in deleteStatus', data: undefined };
    }
}

export const updateStatus = async (id: string, data: StatusFormData)=>{
    try {
        statusSchema.parse(data);
        const status = await authenticatedCall(() => pb.collection('status_options').update<StatusResponse>(id, data));
        const validatedStatus = validatePocketbaseResponse(status, statusSchema);
        return { error: undefined, data: validatedStatus };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in updateStatus', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in updateStatus', error);
        return { error: 'Unknown error in updateStatus', data: undefined };
    }
}