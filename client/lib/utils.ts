import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines Tailwind CSS class names with clsx and tailwind-merge to avoid conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Formats a numeric amount into Indian Rupee currency format (e.g. ₹1,850).
 */
export function formatCurrency(amount: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(amount)
}

/**
 * Formats an ISO date string or Date object into human-readable Indian date format.
 */
export function formatDate(dateInput: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return String(dateInput)
  return new Intl.DateTimeFormat(
    'en-IN',
    options || { month: 'short', day: 'numeric', year: 'numeric' }
  ).format(date)
}

/**
 * Converts a string to URL-friendly slugified format.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

/**
 * Truncates text cleanly at word boundary with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str
  return str.slice(0, maxLength).trim() + '…'
}
