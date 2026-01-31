/**
 * Local storage utility functions
 */

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

/**
 * Store auth token
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Get auth token
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove auth token
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Store user data
 */
export const setUser = (user: object): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Get user data
 */
export const getUser = <T>(): T | null => {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
};

/**
 * Remove user data
 */
export const removeUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

/**
 * Clear all auth data
 */
export const clearAuth = (): void => {
  removeToken();
  removeUser();
};

/**
 * Check if user is logged in
 */
export const isLoggedIn = (): boolean => {
  return !!getToken();
};
