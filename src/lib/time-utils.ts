/**
 * Time Utility Functions
 * All time displays use 12-hour format with AM/PM
 * Supports accurate time with seconds from GPS timestamp
 */

/**
 * Convert 24-hour time string (HH:mm:ss) to 12-hour format with AM/PM
 * @param time - Time string in HH:mm:ss or HH:mm format
 * @returns Time string in 12-hour format (e.g., "09:30 AM")
 */
export function to12HourFormat(time: string | undefined | null): string {
  if (!time) return '--:--';

  // Handle HH:mm:ss or HH:mm format
  const parts = time.split(':');
  if (parts.length < 2) return time;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0'); // Ensure minutes has 2 digits
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

/**
 * Convert 24-hour time string (HH:mm:ss) to 12-hour format with seconds
 * @param time - Time string in HH:mm:ss format
 * @returns Time string in 12-hour format with seconds (e.g., "09:30:45 AM")
 */
export function to12HourFormatWithSeconds(time: string | undefined | null): string {
  if (!time) return '--:--:--';

  const parts = time.split(':');
  if (parts.length < 3) return to12HourFormat(time);

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0'); // Ensure minutes has 2 digits
  const seconds = parts[2].padStart(2, '0'); // Ensure seconds has 2 digits
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Convert Date object to 12-hour time string
 * @param date - Date object
 * @returns Time string in 12-hour format (e.g., "09:30 AM")
 */
export function dateTo12HourFormat(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

/**
 * Convert Date object to 12-hour time string with seconds (ACCURATE TIME)
 * @param date - Date object
 * @returns Time string in 12-hour format with seconds (e.g., "09:30:45 AM")
 */
export function dateTo12HourFormatWithSeconds(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Convert Date object to 24-hour time string with seconds (for database storage)
 * This is the ACCURATE time from GPS timestamp
 * @param date - Date object (preferably GPS timestamp)
 * @returns Time string in 24-hour format with seconds (e.g., "09:30:45")
 */
export function dateTo24HourFormatWithSeconds(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Convert GPS timestamp to accurate time string
 * @param timestamp - GPS timestamp in milliseconds
 * @returns Time string in 12-hour format with seconds
 */
export function gpsTimestampToTime(timestamp: number): string {
  return dateTo12HourFormatWithSeconds(new Date(timestamp));
}

/**
 * Get current time in 12-hour format with seconds (for live clock display)
 * @returns Current time string (e.g., "09:30:45 AM")
 */
export function getCurrentTime12Hour(): string {
  return dateTo12HourFormatWithSeconds(new Date());
}

/**
 * Convert time string from 12-hour to 24-hour format (for database storage)
 * @param time12 - Time string in 12-hour format (e.g., "09:30 AM")
 * @returns Time string in 24-hour format (e.g., "09:30")
 */
export function to24HourFormat(time12: string): string {
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12;
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'AM' && hours === 12) {
    hours = 0;
  } else if (ampm === 'PM' && hours !== 12) {
    hours = hours + 12;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Format time for display in short format (without seconds)
 * @param time - Time string in any format
 * @returns Short time string (e.g., "09:30 AM")
 */
export function formatTimeShort(time: string | undefined | null): string {
  if (!time) return '--:--';
  
  // If it's already in HH:mm format (first 5 chars)
  const shortTime = time.slice(0, 5);
  return to12HourFormat(shortTime);
}

/**
 * Format time with seconds for display (ACCURATE)
 * @param time - Time string in HH:mm:ss format
 * @returns Time string with seconds (e.g., "09:30:45 AM")
 */
export function formatTimeWithSeconds(time: string | undefined | null): string {
  if (!time) return '--:--:--';
  return to12HourFormatWithSeconds(time);
}
