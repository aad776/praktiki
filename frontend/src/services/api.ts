/**
 * Base API configuration and utilities
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  // Build URL with query params
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // Set default headers (avoid setting Content-Type for FormData)
  const isFormData = fetchOptions.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...fetchOptions.headers,
  };

  // Add auth token if available
  const token = localStorage.getItem('access_token');
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * API client with methods for different HTTP requests
 */
const api = {
  get: <T>(endpoint: string, params?: Record<string, string>): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'GET', params });
  },
  
  post: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<T> => {
    const body = data instanceof FormData ? data : data ? JSON.stringify(data) : undefined;
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body,
      ...(options || {}),
    });
  },
  
  put: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<T> => {
    const body = data instanceof FormData ? data : data ? JSON.stringify(data) : undefined;
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body,
      ...(options || {}),
    });
  },
  
  delete: <T>(endpoint: string): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
  },
};

/**
 * Set auth token in localStorage
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('access_token', token);
}

/**
 * Clear auth token from localStorage
 */
export function clearAuthToken(): void {
  localStorage.removeItem('access_token');
}

// Export types for error handling
export type ApiError = Error;

// Export default API client
export default api;

// Export individual methods for backwards compatibility
export const get = api.get;
export const post = api.post;
export const put = api.put;
export const del = api.delete;
