import { Product } from '../types/database';
import { supabase } from '../lib/supabase';

export interface ProductAvailabilityResult {
  isAvailable: boolean;
  badgeText?: string;
  warningMessage?: string;
  servingWindowText?: string;
  formattedFrom?: string;
  formattedUntil?: string;
}

/**
 * Format a 24-hour time string like "12:57:00" or "16:57" into a friendly "12:57 PM"
 */
export function formatTime12Hour(timeStr?: string | null): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Parse a time string into minutes from midnight (0 - 1439)
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Get current time in Indian Standard Time (IST - Asia/Kolkata)
 */
export function getCurrentMinutesInIST(): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    let hour = 0;
    let minute = 0;
    for (const p of parts) {
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
    }
    // Handle 24h edge cases in formatToParts
    if (hour === 24) hour = 0;
    return hour * 60 + minute;
  } catch {
    const now = new Date();
    // Fallback to local
    return now.getHours() * 60 + now.getMinutes();
  }
}

/**
 * Check if the current time falls inside the [from, until] window.
 */
export function isCurrentlyInTimeWindow(
  fromStr?: string | null,
  untilStr?: string | null
): boolean {
  if (!fromStr || !untilStr) return true;

  const fromMinutes = parseTimeToMinutes(fromStr);
  const untilMinutes = parseTimeToMinutes(untilStr);

  if (fromMinutes === null || untilMinutes === null) return true;

  const currentMinutes = getCurrentMinutesInIST();

  if (fromMinutes <= untilMinutes) {
    // Normal single-day window (e.g., 12:57 to 16:57)
    return currentMinutes >= fromMinutes && currentMinutes <= untilMinutes;
  } else {
    // Overnight window (e.g., 20:00 to 02:00)
    return currentMinutes >= fromMinutes || currentMinutes <= untilMinutes;
  }
}

/**
 * Determine a product's full availability status and messages for UI presentation
 */
export function getProductAvailability(product: Product): ProductAvailabilityResult {
  // 1. Explicit admin toggle
  if (product.is_available === false) {
    return {
      isAvailable: false,
      badgeText: 'Currently Unavailable',
      warningMessage: 'Item is marked unavailable by kitchen.',
    };
  }

  // 2. Stock count
  if (product.stock !== undefined && product.stock !== null && product.stock <= 0) {
    return {
      isAvailable: false,
      badgeText: 'Out of Stock',
      warningMessage: 'Item is currently out of stock.',
    };
  }

  // 3. Serving hours / Time window constraint
  const hasWindow = Boolean(product.available_from && product.available_until);
  if (hasWindow) {
    const fromFormatted = formatTime12Hour(product.available_from);
    const untilFormatted = formatTime12Hour(product.available_until);
    const servingWindowText = `${fromFormatted} – ${untilFormatted}`;

    const isInsideWindow = isCurrentlyInTimeWindow(
      product.available_from,
      product.available_until
    );

    if (!isInsideWindow) {
      return {
        isAvailable: false,
        badgeText: `Available ${servingWindowText}`,
        warningMessage: `Kitchen serving hours: ${servingWindowText}`,
        servingWindowText,
        formattedFrom: fromFormatted,
        formattedUntil: untilFormatted,
      };
    }

    return {
      isAvailable: true,
      badgeText: `Serving Now (${servingWindowText})`,
      servingWindowText,
      formattedFrom: fromFormatted,
      formattedUntil: untilFormatted,
    };
  }

  // Default: available all day
  return {
    isAvailable: true,
  };
}

/**
 * In-memory cache for authoritative Supabase RPC check
 */
const rpcAvailabilityCache = new Map<string, { orderable: boolean; expiry: number }>();

/**
 * Authoritative check with Supabase database RPC: `is_product_orderable(p_product_id)`
 */
export async function checkProductOrderableRPC(productId: string): Promise<boolean> {
  const cached = rpcAvailabilityCache.get(productId);
  const now = Date.now();
  if (cached && cached.expiry > now) {
    return cached.orderable;
  }

  try {
    const { data, error } = await supabase.rpc('is_product_orderable', {
      p_product_id: productId,
    });

    if (!error && typeof data === 'boolean') {
      rpcAvailabilityCache.set(productId, {
        orderable: data,
        expiry: now + 30000, // cache for 30s
      });
      return data;
    }
  } catch (err) {
    console.warn('RPC is_product_orderable check fallback:', err);
  }

  return true;
}

/**
 * Format raw database error message into clean user-friendly text.
 * E.g. converts:
 * Product "Brqd" is only available between 12:57:00 and 16:57:00
 * -> Product "Brqd" is only available between 12:57 PM and 4:57 PM
 */
export function formatAvailabilityErrorMessage(rawMessage?: string | null): string {
  if (!rawMessage) {
    return 'Failed to add items to order. Please try again.';
  }

  // Match: Product "..." is only available between HH:MM:SS and HH:MM:SS
  const match = rawMessage.match(/Product "(.*?)" is only available between (\d{1,2}:\d{2}(?::\d{2})?) and (\d{1,2}:\d{2}(?::\d{2})?)/i);

  if (match) {
    const [, productName, fromTime, untilTime] = match;
    const formattedFrom = formatTime12Hour(fromTime);
    const formattedUntil = formatTime12Hour(untilTime);
    return `Kitchen Notice: "${productName}" is only available between ${formattedFrom} and ${formattedUntil}. Please remove it to proceed.`;
  }

  return rawMessage;
}
