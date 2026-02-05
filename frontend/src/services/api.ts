/**
 * Base API configuration and utilities
 */

import { config } from '../config';

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
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  };

  // Add auth token if available
  let token = localStorage.getItem(config.auth.tokenKey);
  if (token && token !== 'null' && token !== 'undefined') {
    token = token.trim();
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Using Auth Token:', token.substring(0, 10) + '...');
  } else {
    console.log('No Auth Token found in localStorage');
  }

  // Merge custom headers
  if (fetchOptions.headers) {
    Object.assign(headers, fetchOptions.headers);
  }

  console.log('Final API Request:', {
    url,
    method: fetchOptions.method || 'GET',
    headers,
    hasBody: !!fetchOptions.body
  });

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - token expired or invalid
    // Skip this for login endpoint to show correct "Invalid credentials" error
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      console.warn('Token expired or invalid, clearing auth state');
      localStorage.removeItem(config.auth.tokenKey);
      localStorage.removeItem(config.auth.roleKey);
      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
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

  patch: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<T> => {
    const body = data instanceof FormData ? data : data ? JSON.stringify(data) : undefined;
    return apiRequest<T>(endpoint, {
      method: 'PATCH',
      body,
      ...(options || {}),
    });
  },
};

/**
 * Set auth token in localStorage
 */
export function setAuthToken(token: string): void {
  localStorage.setItem(config.auth.tokenKey, token);
}

/**
 * Clear auth token from localStorage
 */
export function clearAuthToken(): void {
  localStorage.removeItem(config.auth.tokenKey);
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
