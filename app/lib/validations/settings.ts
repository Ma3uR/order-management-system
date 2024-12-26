import { z } from "zod";
import type { 
  CurrencyOptionsRecord, 
  StatusOptionsRecord, 
  PaymentOptionsRecord, 
  DeliveryOptionsRecord,
  SourcesRecord 
} from "@/app/types/pocketbase-types";

// Currency validation schema
export const currencySchema = z.object({
  code: z.string()
    .min(2, "Currency code must be at least 2 characters")
    .max(10, "Currency code must be less than 10 characters"),
  name: z.string()
    .min(2, "Currency name must be at least 2 characters")
    .max(50, "Currency name must be less than 50 characters"),
  symbol: z.string()
    .min(1, "Currency symbol is required")
    .max(5, "Currency symbol must be less than 5 characters"),
  isDefault: z.boolean(),
}) satisfies z.ZodType<CurrencyOptionsRecord>;

// Status validation schema
export const statusSchema = z.object({
  name: z.string()
    .min(2, "Status name must be at least 2 characters")
    .max(50, "Status name must be less than 50 characters"),
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  priority: z.number()
    .int()
    .min(1, "Priority must be at least 1")
    .max(99, "Priority must be less than 99"),
}) satisfies z.ZodType<StatusOptionsRecord>;

// Payment method validation schema
export const paymentMethodSchema = z.object({
  name: z.string()
    .min(2, "Payment method name must be at least 2 characters")
    .max(50, "Payment method name must be less than 50 characters"),
}) satisfies z.ZodType<PaymentOptionsRecord>;

// Delivery method validation schema
export const deliveryMethodSchema = z.object({
  name: z.string()
    .min(2, "Delivery method name must be at least 2 characters")
    .max(50, "Delivery method name must be less than 50 characters"),
}) satisfies z.ZodType<DeliveryOptionsRecord>;

// Source validation schema
export const sourceSchema = z.object({
  name: z.string()
    .min(2, "Source name must be at least 2 characters")
    .max(50, "Source name must be less than 50 characters"),
  url: z.string()
    .url("Invalid URL")
    .optional(),
}) satisfies z.ZodType<SourcesRecord>;

// Export types
export type CurrencyFormData = z.infer<typeof currencySchema>;
export type StatusFormData = z.infer<typeof statusSchema>;
export type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;
export type DeliveryMethodFormData = z.infer<typeof deliveryMethodSchema>;
export type SourceFormData = z.infer<typeof sourceSchema>;