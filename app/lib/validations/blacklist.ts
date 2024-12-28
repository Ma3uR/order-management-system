import { z } from "zod";
import type { BlacklistEntriesRecord } from "@/app/types/pocketbase-types";

export const blacklistEntrySchema = z.object({
  fullName: z.string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters")
    .optional(),
  
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[+]?[\d\s-]+$/, "Invalid phone number format")
    .optional(),
  
  city: z.string()
    .max(100, "City name must be less than 100 characters")
    .optional(),
  
  totalOrderSum: z.number()
    .min(0, "Total order sum cannot be negative")
    .optional(),
  
  notes: z.string()
    .max(500, "Notes must be less than 500 characters")
    .optional(),
}) satisfies z.ZodType<BlacklistEntriesRecord>;

export type BlacklistFormData = z.infer<typeof blacklistEntrySchema>;

export enum StatusOptions {
	StatusOptions = "status_options",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string 