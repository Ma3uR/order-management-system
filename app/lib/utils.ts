import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Concatenates and merges class names using the twMerge and clsx functions.
 * @param {...ClassValue[]} inputs - An array of class values to be merged.
 * @returns {string} A string of merged and concatenated class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
