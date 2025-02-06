"use server";

import pb, { authenticatedCall } from "../../../lib/pocketbase";
import { OrdersResponse, SourcesResponse } from "../../../types/pocketbase-types";
import { validatePocketbaseResponse } from "../../../lib/api-utils";
import { SourceFormData } from "../../../lib/validations/settings";
import { sourceSchema } from "../../../lib/validations/settings";

export const getAllSources = async ()=>{
  try {
    const sources = await authenticatedCall(() => 
        pb.collection('sources').getFullList<SourcesResponse>({
            sort: '-created',
        })
    );
    const validatedSources = sources.map(source => validatePocketbaseResponse(source, sourceSchema));
    return { error: undefined, data: validatedSources };
  } catch (error: unknown) {
    if (error instanceof Error) {
        console.error('Error in getAllSources', error);
        return { error: error.message, data: undefined };
    }
    console.error('Error in getAllSources', error);
    return { error: 'Unknown error in getAllSources', data: undefined };
  }
}

export const createSource = async (data: SourceFormData)=>{
    try {
        sourceSchema.parse(data);
        const source = await authenticatedCall(() => pb.collection('sources').create<SourcesResponse>(data));
        const validatedSource = validatePocketbaseResponse(source, sourceSchema);
        return { error: undefined, data: validatedSource };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in createSource', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in createSource', error);
        return { error: 'Unknown error in createSource', data: undefined };
    }
}

export const getSourceById = async (id: string)=>{
    try {
        const source = await authenticatedCall(() => 
            pb.collection('sources').getOne<SourcesResponse>(id)
        );
        const validatedSource = validatePocketbaseResponse(source, sourceSchema);
        return { error: undefined, data: validatedSource };
    } catch (error:unknown) {
        if (error instanceof Error) {
            console.error('Error in getSourceById', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in getSourceById', error);
        return { error: 'Unknown error in getSourceById', data: undefined };
    }
}

export const updateSource = async (id: string, data: SourceFormData)=>{
    try {
        sourceSchema.parse(data);
        const source = await authenticatedCall(() => 
            pb.collection('sources').update<SourcesResponse>(id, data)
        );
        const validatedSource = validatePocketbaseResponse(source, sourceSchema);
        return { error: undefined, data: validatedSource };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in updateSource', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in updateSource', error);
        return { error: 'Unknown error in updateSource', data: undefined };
    }
}

export const deleteSource = async (id: string)=>{
    try {
      const orders = await authenticatedCall(() => 
          pb.collection('orders').getList<OrdersResponse>(1, 1, {
              filter: `source = "${id}"`,
          })
      );

      if (orders.totalItems > 0) {
        throw new Error('Cannot delete source that is being used in orders');
      }

      const delitionStatus = await authenticatedCall(() => pb.collection('sources').delete(id));
      return { error: undefined, data: delitionStatus };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in deleteSource', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in deleteSource', error);
        return { error: 'Unknown error in deleteSource', data: undefined };
    }
}