/**
 * UI Utility Functions
 * Common utilities for className manipulation and UI operations
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper specificity handling
 * Combines clsx for conditional classes with twMerge to handle Tailwind conflicts
 *
 * @example
 * cn("px-2 py-1", "px-4") // => "px-4 py-1"
 * cn("px-2", condition && "px-4") // => conditional class merging
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format bytes to human-readable file size
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted file size string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format date to readable string
 * @param date - Date object or ISO string
 * @param format - Optional format pattern
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, format: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param date - Date object or ISO string
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (seconds < 30) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(dateObj);
}

/**
 * Truncate text to specified length with ellipsis
 * @param text - Text to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to add (default: "...")
 * @returns Truncated text
 */
export function truncateText(text: string, length: number, suffix: string = '...'): string {
  if (text.length <= length) return text;
  return text.slice(0, length - suffix.length) + suffix;
}

/**
 * Debounce function execution
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - Value to check
 * @returns True if empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Get initials from a name
 * @param name - Full name
 * @returns Initials (e.g., "John Doe" => "JD")
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
}

/**
 * Generate a random color based on a seed string
 * @param seed - String to seed the color generation
 * @returns Hex color string
 */
export function getColorFromString(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}
