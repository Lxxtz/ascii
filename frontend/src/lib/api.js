/**
 * API utility to handle base URL and pathing.
 */
export const apiUrl = (path) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return `${baseUrl}${path}`;
};
