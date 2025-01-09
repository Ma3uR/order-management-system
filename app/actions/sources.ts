"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/options";
import pb, { authenticatedCall } from "../lib/pocketbase";
import { OrdersResponse, SourcesResponse } from "../types/pocketbase-types";

export async function getAllSources(): Promise<{
  error: string | undefined;
  data: SourcesResponse[] | undefined;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error('Unauthorized');
    }

    const sources = await authenticatedCall(() => 
        pb.collection('sources').getFullList<SourcesResponse>({
          sort: '-created',
        })
      );

    return {
        error: undefined,
        data: sources,
    }
  } catch (error:unknown) {
    console.error("Error in getSources ", error);

    const message = error instanceof Error ? error.message : 'Unknown error in getSources';

    return {
        error:message,
        data: undefined,
    }
  }
}

export async function getSourceById(id: string): Promise<{
    error: string | undefined;
    data: SourcesResponse | undefined;
}> {
    try {
        const source = await authenticatedCall(() => 
            pb.collection('sources').getOne<SourcesResponse>(id)
        );
        return {
            error: undefined,
            data: source,
        }
    } catch (error:unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error in getSourceById';
        return {
            error: message,
            data: undefined,
        }
    }
}

export async function updateSource(id: string, data: Record<string, unknown>): Promise<{
    error: string | undefined;
    data: SourcesResponse | undefined;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error('Unauthorized');
    }

    const source = await authenticatedCall(() => 
        pb.collection('sources').update<SourcesResponse>(id, data)
    );
    return {
      error: undefined,
      data: source,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error in updateSource';
    return {
      error: message,
      data: undefined,
    }
  }
}

export async function deleteSource(id: string): Promise<{
    error: string | undefined;
    data: boolean | undefined;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Check if source is used in any orders
    const orders = await authenticatedCall(() => 
        pb.collection('orders').getList<OrdersResponse>(1, 1, {
            filter: `source = "${id}"`,
        })
    );

    if (orders.totalItems > 0) {
      throw new Error('Cannot delete source that is being used in orders');
    }

    await authenticatedCall(() => pb.collection('sources').delete(id));
    return {
      error: undefined,
      data: true,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error in deleteSource';
    return {
      error: message,
      data: undefined,
    }
  }
}

export async function createSource(data: Record<string, unknown>): Promise<{
    error: string | undefined;
    data: SourcesResponse | undefined;
}> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error('Unauthorized');
        }

        const source = await authenticatedCall(() => 
            pb.collection('sources').create<SourcesResponse>(data)
        );
        return {
            error: undefined,
            data: source,
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error in createSource';
        return {
            error: message,
            data: undefined,
        }
    }
}