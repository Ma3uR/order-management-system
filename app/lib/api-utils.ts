import { z } from "zod";
import type { BaseSystemFields } from "../types/pocketbase-types";

export type ApiResponse<T> = {
  error?: string;
  data?: T;
};

export function validatePocketbaseResponse<T extends z.ZodSchema>(
  response: unknown,
  schema: T
): z.infer<T> & BaseSystemFields {
  const responseSchema = z.object({
    id: z.string(),
    created: z.string(),
    updated: z.string(),
    collectionId: z.string(),
    collectionName: z.string(),
  }).and(schema);

  return responseSchema.parse(response);
}