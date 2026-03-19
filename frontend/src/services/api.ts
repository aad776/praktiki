/**
 * Base API configuration and utilities
 */

import { config } from '../config';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  responseType?: 'json' | 'blob';
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, responseType = 'json', ...fetchOptions } = options;

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
  }

  // Merge custom headers
  if (fetchOptions.headers) {
    Object.assign(headers, fetchOptions.headers);
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem(config.auth.tokenKey);
      localStorage.removeItem(config.auth.roleKey);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    let errorMessage = `Request failed with status ${response.status}`;
    let errorData = null;
    try {
      errorData = await response.json();
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        } else if (typeof errorData.detail === 'object') {
          errorMessage = JSON.stringify(errorData.detail);
        } else {
          errorMessage = errorData.detail;
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (responseType === 'blob') {
    return response.blob() as unknown as T;
  }

  try {
    return await response.json() as T;
  } catch (e) {
    return {} as T;
  }
}

/**
 * API client with methods for different HTTP requests
 */
const api = {
  get: <T>(endpoint: string, options?: RequestOptions): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'GET', ...options });
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

  defaults: {
    baseURL: API_BASE_URL
  }
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
export interface ApiError extends Error {
  response?: {
    status: number;
    data?: any;
  };
}

// Export default API client
export default api;

// Export individual methods for backwards compatibility
export const get = api.get;
export const post = api.post;
export const put = api.put;
export const del = api.delete;
