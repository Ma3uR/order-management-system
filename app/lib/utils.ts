import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with Tailwind's class merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const showConfirmDialog = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const confirmed = window.confirm(message);
    resolve(confirmed);
  });
};

/**
 * Generate a UUID (v4) for unique identification
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Simple fetch wrapper for data fetching
 */
export async function fetcher(url: string) {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  
  return res.json();
}

/**
 * Format a number as currency (UAH)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
