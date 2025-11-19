/**
 * GREENWOOD HALL DATETIME HANDLING - CANONICAL MODEL
 * ===================================================
 * 
 * BUSINESS TIMEZONE: America/New_York (East Islip, NY)
 * 
 * CORE PRINCIPLE:
 * When a user selects "December 5, 2025 @ 12:00 PM" in the UI, the system MUST
 * treat this as December 5th, 2025 at 12:00 PM in America/New_York timezone,
 * regardless of where the server runs or how Postgres stores the data.
 * 
 * DATABASE STORAGE MODEL:
 * -----------------------
 * - eventDate: DateTime (Postgres TIMESTAMPTZ)
 *   → Stores the LOCAL date at midnight (00:00) in America/New_York
 *   → Used for day-based queries and calendar placement
 * 
 * - startTime: DateTime (Postgres TIMESTAMPTZ) 
 *   → Stores the LOCAL date/time in America/New_York
 *   → e.g., "2025-12-05 12:00" in NY time
 * 
 * - endTime: DateTime (Postgres TIMESTAMPTZ)
 *   → Stores the LOCAL date/time in America/New_York
 *   → e.g., "2025-12-05 18:00" in NY time
 * 
 * CONVERSION STRATEGY:
 * --------------------
 * We use JavaScript Date objects with the LOCAL timezone constructor to ensure
 * dates are interpreted in the server's local timezone (which should match 
 * America/New_York for Greenwood Hall's servers).
 * 
 * When creating Date objects:
 * ✅ DO:    new Date(2025, 11, 5, 12, 0)  // Local timezone constructor
 * ❌ DON'T: new Date('2025-12-05')        // Parses as UTC midnight, shifts dates
 * ❌ DON'T: new Date('2025-12-05T12:00')  // Parses as UTC, causes timezone shift
 * 
 * DISPLAY STRATEGY:
 * -----------------
 * Treat ISO strings from Postgres as instants in time and format them directly
 * in America/New_York via Intl.DateTimeFormat with an explicit timeZone.
 * This avoids double-applying timezone offsets now that storage is correct UTC.
 */

export const BUSINESS_TIMEZONE = 'America/New_York';

function coerceToDate(input: Date | string): Date {
  return typeof input === 'string' ? new Date(input) : input;
}

/**
 * Parse a date string in YYYY-MM-DD format and return year, month (1-12), and day
 */
export function parseDateString(dateStr: string): { year: number; month: number; day: number } | null {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;

  const [yearStr, monthStr, dayStr] = parts;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
}

/**
 * Parse a time string in HH:MM format and return hours and minutes
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

/**
 * Create a Date object for a specific local date (at midnight)
 * This is used for eventDate fields.
 * 
 * @param dateStr - Date string in YYYY-MM-DD format (e.g., "2025-12-05")
 * @returns Date object representing midnight on that date in local timezone
 */
export function createLocalDate(dateStr: string): Date | null {
  const parsed = parseDateString(dateStr);
  if (!parsed) return null;

  const { year, month, day } = parsed;
  
  // Month is 0-indexed in Date constructor (0 = January)
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Create a Date object for a specific local date and time
 * This is used for startTime and endTime fields.
 * 
 * @param dateStr - Date string in YYYY-MM-DD format (e.g., "2025-12-05")
 * @param timeStr - Time string in HH:MM format (e.g., "12:00")
 * @returns Date object representing that date/time in local timezone
 */
export function createLocalDateTime(dateStr: string, timeStr: string): Date | null {
  const parsedDate = parseDateString(dateStr);
  const parsedTime = parseTimeString(timeStr);
  
  if (!parsedDate || !parsedTime) return null;

  const { year, month, day } = parsedDate;
  const { hours, minutes } = parsedTime;
  
  // Month is 0-indexed in Date constructor (0 = January)
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Get the weekday (0=Sunday, 6=Saturday) for a date string in local timezone
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Day of week (0-6) or null if invalid
 */
export function getLocalWeekday(dateStr: string): number | null {
  const date = createLocalDate(dateStr);
  if (!date) return null;
  return date.getDay();
}

/**
 * Format a Date object or ISO string for display as a date
 * Extracts UTC components and reconstructs as local to prevent timezone shift
 * 
 * @param input - Date object or ISO string from database
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateForDisplay(
  input: Date | string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  const date = coerceToDate(input);

  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: BUSINESS_TIMEZONE,
  }).format(date);
}

/**
 * Format a Date object or ISO string for display as a time
 * Extracts UTC components and reconstructs as local to prevent timezone shift
 * 
 * @param input - Date object or ISO string from database
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted time string
 */
export function formatTimeForDisplay(
  input: Date | string,
  options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }
): string {
  const date = coerceToDate(input);

  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: BUSINESS_TIMEZONE,
  }).format(date);
}

/**
 * Format a Date object or ISO string as HH:MM for admin displays
 * 
 * @param input - Date object or ISO string from database
 * @returns Time string in HH:MM format
 */
export function formatTimeAsHHMM(input: Date | string): string {
  const date = coerceToDate(input);

  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Get start and end of day boundaries for date range queries
 * Returns local dates that represent the full day in local timezone
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Object with startOfDay and endOfDay Date objects, or null if invalid
 */
export function getDayBoundaries(dateStr: string): { startOfDay: Date; endOfDay: Date } | null {
  const startOfDay = createLocalDate(dateStr);
  if (!startOfDay) return null;
  
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  
  return { startOfDay, endOfDay };
}

/**
 * Check if a date string represents a weekend (Friday, Saturday, or Sunday)
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns true if weekend, false if weekday, null if invalid
 */
export function isWeekend(dateStr: string): boolean | null {
  const weekday = getLocalWeekday(dateStr);
  if (weekday === null) return null;
  
  // 0=Sunday, 5=Friday, 6=Saturday
  return weekday === 0 || weekday === 5 || weekday === 6;
}
