import { z } from "zod";
import { OrdersRecord, OrdersMergeStatusOptions, OrdersMergeSourceOptions } from "@/app/types/pocketbase-types";

const productSchema = z.object({
  title: z.string().min(1, "Product name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be non-negative"),
});

// Define a schema for Nova Poshta invoice data
const invoiceDataSchema = z.object({
  Ref: z.string(),
  CostOnSite: z.union([z.string(), z.number()]).optional(),
  EstimatedDeliveryDate: z.string().optional(),
  IntDocNumber: z.string(),
  TypeDocument: z.string().optional(),
}).passthrough(); // Allow additional properties

export const orderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  marketplaceIds: z.string().optional(),
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
  mergeSource: z.nativeEnum(OrdersMergeSourceOptions),
  archived: z.boolean().optional(),
  productionCost: z.number().min(0, "Production cost must be non-negative").optional(),
  invoice_data: z.union([invoiceDataSchema, z.null()]).optional(),
}) satisfies z.ZodType<OrdersRecord>;

export type OrderFormData = z.infer<typeof orderSchema>;
export type ProductFormData = z.infer<typeof productSchema>; 