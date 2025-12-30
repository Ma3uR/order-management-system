/**
 * Rozetka Delivery Service
 * Handles TTN (Transport Waybill Number) creation for Rozetka orders
 */

import axios from "axios";
import type {
  RozetkaTTNRequest,
  RozetkaTTNResponse,
  RozetkaDeliveryParams,
  RozetkaDeliverySender,
  RozetkaTTNFormData,
} from "@/app/types/rozetka";

const ROZETKA_API_BASE = "https://api-seller.rozetka.com.ua";

/**
 * Creates a TTN for a Rozetka order
 * @param token - Rozetka API Bearer token
 * @param request - TTN creation request data
 * @returns Promise with TTN creation response
 */
export async function createRozetkaTTN(
  token: string,
  request: RozetkaTTNRequest
): Promise<RozetkaTTNResponse> {
  try {
    const response = await axios.post<RozetkaTTNResponse>(
      `${ROZETKA_API_BASE}/delivery-rozetka/create-order-ttn`,
      request,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      // Return API error response
      return error.response.data as RozetkaTTNResponse;
    }

    // Rethrow unexpected errors
    throw error;
  }
}

/**
 * Calculates volume from dimensions
 * @param length - Length in cm
 * @param width - Width in cm
 * @param height - Height in cm
 * @returns Volume in cubic meters
 */
export function calculateVolume(
  length: number,
  width: number,
  height: number
): number {
  // Convert from cm³ to m³
  return Number(((length * width * height) / 1000000).toFixed(3));
}

/**
 * Validates TTN form data
 * @param data - Form data to validate
 * @returns Object with validation result and errors
 */
export function validateTTNFormData(data: RozetkaTTNFormData): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Validate package dimensions
  if (!data.weight || data.weight <= 0) {
    errors.weight = "Weight must be greater than 0";
  }
  if (!data.length || data.length <= 0) {
    errors.length = "Length must be greater than 0";
  }
  if (!data.width || data.width <= 0) {
    errors.width = "Width must be greater than 0";
  }
  if (!data.height || data.height <= 0) {
    errors.height = "Height must be greater than 0";
  }

  // Validate description
  if (data.description && data.description.length > 100) {
    errors.description = "Description must be 100 characters or less";
  }

  // Validate sender details
  if (!data.senderCity || data.senderCity.trim() === "") {
    errors.senderCity = "Sender city is required";
  }
  if (!data.senderAddress || data.senderAddress.trim() === "") {
    errors.senderAddress = "Sender address is required";
  }
  if (!data.senderDepartment || data.senderDepartment.trim() === "") {
    errors.senderDepartment = "Sender department UUID is required";
  }
  if (!data.senderName || data.senderName.trim() === "") {
    errors.senderName = "Sender name is required";
  }
  if (!data.senderPhones || data.senderPhones.length === 0) {
    errors.senderPhones = "At least one phone number is required";
  }

  // Validate payment details
  if (!data.hasPaid && (!data.codAmount || data.codAmount <= 0)) {
    errors.codAmount = "COD amount is required when order is not fully paid";
  }
  if (data.hasPaid && data.codAmount > 0) {
    errors.codAmount = "COD amount must be 0 when order is fully paid";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Converts form data to Rozetka TTN request format
 * @param orderId - Rozetka order ID
 * @param formData - Form data from UI
 * @returns Formatted TTN request
 */
export function buildTTNRequest(
  orderId: number,
  formData: RozetkaTTNFormData
): RozetkaTTNRequest {
  const volume = calculateVolume(
    formData.length,
    formData.width,
    formData.height
  );

  const params: RozetkaDeliveryParams = {
    weight: formData.weight,
    length: formData.length,
    width: formData.width,
    height: formData.height,
    volume,
  };

  const sender: RozetkaDeliverySender = {
    type: formData.senderType,
    city: formData.senderCity,
    address: formData.senderAddress,
    department: formData.senderDepartment,
    name: formData.senderName,
    phones: formData.senderPhones,
    info: formData.senderInfo,
  };

  const request: RozetkaTTNRequest = {
    order_id: orderId,
    payer: "sender",
    places: 1,
    params,
    sender,
    description: formData.description || undefined,
    has_paid: formData.hasPaid,
    cost: formData.hasPaid ? 0 : formData.codAmount,
    carrier: formData.carrier,
    departure_time: formData.departureTime,
    return_operations: formData.returnOperations,
    registration_date: new Date().toISOString(),
  };

  return request;
}

/**
 * Formats Rozetka API error for display
 * @param error - Error from API response
 * @returns User-friendly error message
 */
export function formatRozetkaError(error: Record<string, unknown>): string {
  if (error?.errors?.fields) {
    // Validation errors
    const fieldErrors = Object.entries(error.errors.fields)
      .map(([field, messages]) => `${field}: ${(messages as string[]).join(", ")}`)
      .join("; ");
    return `Validation error: ${fieldErrors}`;
  }

  if (error?.errors?.message) {
    return `Error: ${error.errors.message}`;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error occurred while creating TTN";
}
