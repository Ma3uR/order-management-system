import { format as dateFnsFormat } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { uk } from "date-fns/locale";

const KYIV_TIMEZONE = "Europe/Kyiv";

/**
 * Formats a date in Kyiv timezone with the specified format
 * @param date - Date string or Date object
 * @param formatString - Format string (e.g., "MMM d, yyyy HH:mm")
 * @returns Formatted date string in Kyiv timezone
 */
export function formatDateKyiv(date: string | Date, formatString: string): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;
  const kyivDate = utcToZonedTime(dateObj, KYIV_TIMEZONE);

  return dateFnsFormat(kyivDate, formatString, { locale: uk });
}

/**
 * Formats a date in Kyiv timezone with a short format (MMM d, yyyy HH:mm)
 * @param date - Date string or Date object
 * @returns Formatted date string in Kyiv timezone
 */
export function formatDateShortKyiv(date: string | Date): string {
  return formatDateKyiv(date, "MMM d, yyyy HH:mm");
}

/**
 * Formats a date in Kyiv timezone with a long format (PPPp)
 * @param date - Date string or Date object
 * @returns Formatted date string in Kyiv timezone
 */
export function formatDateLongKyiv(date: string | Date): string {
  return formatDateKyiv(date, "PPPp");
}
