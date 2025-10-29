import type { DeliveryOptionsResponse, PaymentMethodsResponse } from "@/app/types/pocketbase-types";

/**
 * Gets the display name for a delivery method by ID
 * @param id - Delivery method ID
 * @param deliveryMethods - Array of delivery method options
 * @returns The delivery method name or fallback text
 */
export function getDeliveryMethodName(
  id: string | undefined,
  deliveryMethods: DeliveryOptionsResponse[]
): string {
  if (!id) return "Не вказано";

  const method = deliveryMethods.find((m) => m.id === id);
  return method?.name || "Не вказано";
}

/**
 * Gets the display name for a payment method by ID
 * @param id - Payment method ID
 * @param paymentMethods - Array of payment method options
 * @returns The payment method name or fallback text
 */
export function getPaymentMethodName(
  id: string | undefined,
  paymentMethods: PaymentMethodsResponse[]
): string {
  if (!id) return "Не вказано";

  const method = paymentMethods.find((m) => m.id === id);
  return method?.name || "Не вказано";
}
