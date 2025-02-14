import { z } from "zod";
import { OrdersRecord, OrdersMergeStatusOptions, OrdersMergeSourceOptions } from "@/app/types/pocketbase-types";

const productSchema = z.object({
  title: z.string().min(1, "Product name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be non-negative"),
});

export const orderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  marketplaceId: z.string().optional(),
  source: z.string().min(1, "Source is required"),
  deliveryMethod: z.string().min(1, "Delivery method is required"), 
  deliveryPostNumber: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  fullName: z.string().min(1, "Full name is required"),
  products: z.array(productSchema).min(1, "At least one product is required"),
  numberOfItems: z.number().min(1, "Number of items must be at least 1"),
  amount: z.number().min(0, "Amount must be non-negative"),
  status: z.string().min(1, "Status is required"),
  currency: z.string().min(1, "Currency is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  notes: z.string().optional(),
  mergeStatus: z.nativeEnum(OrdersMergeStatusOptions),
  mergedWithOrderId: z.string().optional(),
  originalOrders: z.array(z.any()).nullable().optional(),
  mergeSource: z.nativeEnum(OrdersMergeSourceOptions)
}) satisfies z.ZodType<OrdersRecord>;

export type OrderFormData = z.infer<typeof orderSchema>;
export type ProductFormData = z.infer<typeof productSchema>; 