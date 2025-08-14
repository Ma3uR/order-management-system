import { z } from "zod";
import type { BlacklistEntriesRecord, BlacklistEntriesResponse } from "@/app/types/pocketbase-types";



// View modes for the blacklist display
export enum ViewMode {
  CARD = "card",
  TABLE = "table"
}

// Sorting options
export enum SortOption {
  DATE_DESC = "date_desc",
  DATE_ASC = "date_asc",
  NAME_ASC = "name_asc",
  NAME_DESC = "name_desc",
  ORDER_SUM_DESC = "order_sum_desc",
  ORDER_SUM_ASC = "order_sum_asc"
}

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
  
  expiryDate: z.string().datetime().optional(),
}) satisfies z.ZodType<Partial<BlacklistEntriesRecord & { 
  expiryDate?: string;
}>>;

export type BlacklistFormData = z.infer<typeof blacklistEntrySchema>;

// Enhanced blacklist entry with computed fields
export interface EnhancedBlacklistEntry extends BlacklistEntriesResponse {
  expiryDate?: string;
  isExpired?: boolean;
}

// Filter configuration
export interface BlacklistFilters {
  search: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
  orderSumRange: {
    min?: number;
    max?: number;
  };
  showExpired: boolean;
}

// Bulk operation types
export interface BulkOperation {
  type: 'delete' | 'export';
  selectedIds: string[];
  payload?: {
    format?: 'csv' | 'excel';
  };
}

// Sort configuration
export interface SortConfig {
  field: SortOption;
  direction: 'asc' | 'desc';
}

// Pagination enhanced with filtering
export interface PaginationConfig extends PaginationInfo {
  filters: BlacklistFilters;
  sort: SortConfig;
}

// Keep existing interfaces
export interface PaginationInfo {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export enum StatusOptions {
	StatusOptions = "status_options",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string 