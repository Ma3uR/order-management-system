"use server";

import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { StatusResponse } from '@/app/types/pocketbase-types';

export async function getAllStatuses(): Promise<{
    error: string | undefined;
    data: StatusResponse[] | undefined;
}> {
    try {
        const statuses = await authenticatedCall(() => pb.collection('status_options').getFullList<StatusResponse>({
            sort: '-created',
        }));
        return {
            error: undefined,
            data: statuses,
        }
    } catch (error) {
        console.error('Error in getAllStatuses', error);
        return { error: 'Unknown error in getAllStatuses', data: undefined };
    }
}

export async function createStatus(data: Record<string, unknown>): Promise<{
    error: string | undefined;
    data: StatusResponse | undefined;
}> {
    try {
        const status = await authenticatedCall(() => pb.collection('status_options').create<StatusResponse>(data));
        return {
            error: undefined,
            data: status,
        }
    } catch (error) {
        console.error('Error in createStatus', error);
        return { error: 'Unknown error in createStatus', data: undefined };
    }
}

export async function updateStatus(id: string, data: Record<string, unknown>): Promise<{
    error: string | undefined;
    data: StatusResponse | undefined;
}> {
    try {
        const status = await authenticatedCall(() => pb.collection('status_options').update<StatusResponse>(id, data));
        return {
            error: undefined,
            data: status,
        }
    } catch (error) {
        console.error('Error in updateStatus', error);
        return { error: 'Unknown error in updateStatus', data: undefined };
    }
}

export async function deleteStatus(id: string): Promise<{
    error: string | undefined;
    data: boolean | undefined;
}> {
    try {
        const status = await authenticatedCall(() => pb.collection('status_options').delete(id));
        return {
            error: undefined,
            data: status,
        }
    } catch (error) {
        console.error('Error in deleteStatus', error);
        return { error: 'Unknown error in deleteStatus', data: undefined };
    }
}

export async function getStatus(id: string): Promise<{
    error: string | undefined;
    data: StatusResponse | undefined;
}> {
    try {
        const status = await authenticatedCall(() => pb.collection('status_options').getOne<StatusResponse>(id));
        return {
            error: undefined,
            data: status,
        }
    } catch (error) {
        console.error('Error in getStatus', error);
        return { error: 'Unknown error in getStatus', data: undefined };
    }
}