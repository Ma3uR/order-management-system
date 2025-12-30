"use server";

import type { OrdersResponse } from "@/app/types/pocketbase-types";
import type { RozetkaTTNFormData, RozetkaTTNResponse } from "@/app/types/rozetka";
import {
  createRozetkaTTN,
  buildTTNRequest,
  validateTTNFormData,
  formatRozetkaError,
} from "@/app/lib/services/rozetka-delivery";
import { RozetkaAPI } from "@/app/lib/rozetka-api";
import { authenticatedCall } from "@/app/lib/pocketbase";

/**
 * Creates a Rozetka TTN from an order
 * @param orderId - Internal order ID (PocketBase)
 * @param rozetkaOrderId - Rozetka order ID
 * @param formData - TTN form data
 * @returns Promise with success status and TTN data or error
 */
export async function createRozetkaTTNFromOrder(
  orderId: string,
  rozetkaOrderId: number,
  formData: RozetkaTTNFormData
): Promise<{
  success: boolean;
  data?: RozetkaTTNResponse["content"];
  error?: string;
}> {
  try {
    // Validate form data
    const validation = validateTTNFormData(formData);
    if (!validation.valid) {
      const errorMessages = Object.values(validation.errors).join("; ");
      return {
        success: false,
        error: `Validation failed: ${errorMessages}`,
      };
    }

    // Get Rozetka API token
    const rozetkaAPI = RozetkaAPI.getInstance();
    const token = await rozetkaAPI.ensureValidToken();

    // Build TTN request
    const request = buildTTNRequest(rozetkaOrderId, formData);

    // Create TTN via Rozetka API
    const response = await createRozetkaTTN(token, request);

    // Check if request was successful
    if (!response.success || !response.content) {
      const errorMsg = formatRozetkaError(response);
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Update order in PocketBase with TTN data
    await authenticatedCall(async (pb) => {
      await pb.collection("orders").update(orderId, {
        deliveryPostNumber: response.content!.ttn,
        invoice_data: response.content,
      });
    });

    return {
      success: true,
      data: response.content,
    };
  } catch (error) {
    console.error("Error creating Rozetka TTN:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create TTN",
    };
  }
}

/**
 * Deletes a Rozetka TTN from an order (clears TTN data)
 * Note: This only clears the data locally. Rozetka API doesn't provide TTN deletion.
 * @param orderId - Internal order ID (PocketBase)
 * @returns Promise with success status
 */
export async function deleteRozetkaTTN(orderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await authenticatedCall(async (pb) => {
      await pb.collection("orders").update(orderId, {
        deliveryPostNumber: "",
        invoice_data: null,
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting Rozetka TTN:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete TTN",
    };
  }
}

/**
 * Gets TTN data from an order
 * @param orderId - Internal order ID (PocketBase)
 * @returns Promise with TTN data if exists
 */
export async function getRozetkaTTNData(orderId: string): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const order = await authenticatedCall(async (pb) => {
      return await pb.collection("orders").getOne<OrdersResponse>(orderId);
    });

    if (!order.invoice_data) {
      return {
        success: false,
        error: "No TTN data found for this order",
      };
    }

    return {
      success: true,
      data: order.invoice_data,
    };
  } catch (error) {
    console.error("Error getting Rozetka TTN data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get TTN data",
    };
  }
}
