/**
 * Formats a value or returns 'N/A' if it's falsy
 * @param {*} value - The value to format
 * @returns {string} The value or 'N/A'
 */
export const na = value => value || 'N/A';

/**
 * Formats seconds into hours, minutes, and seconds
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
export const formatFlightHours = seconds => {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}min ${secs.toString().padStart(2, '0')}s`;
};

/**
 * Formats a date string to a localized date
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string or 'N/A'
 */
export const formatDate = dateString => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
