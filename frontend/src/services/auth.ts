/**
 * Authentication API services
 */
import { post, get } from './api';

export interface LoginRequest {
  email: string;
  password: string;
  apaar_id?: string;
}

export interface SignupRequest {
  email: string;
  full_name: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_email_verified: boolean;
}

/**
 * Login user
 */
export const login = (data: LoginRequest): Promise<AuthResponse> => {
  return post<AuthResponse>('/auth/login', data);
};

/**
 * Register new student
 */
export const signup = (data: SignupRequest): Promise<User> => {
  return post<User>('/auth/signup', data);
};

/**
 * Register new employer
 */
export const signupEmployer = (data: SignupRequest & { company_name: string; contact_number: string }): Promise<User> => {
  return post<User>('/auth/signup/employer', data);
};

/**
 * Get current user info
 */
export const getCurrentUser = (): Promise<User> => {
  return get<User>('/auth/me');
};

/**
 * Request password reset
 */
export const forgotPassword = (email: string): Promise<{ message: string }> => {
  return post<{ message: string }>(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
};

/**
 * Reset password with token
 */
export const resetPassword = (token: string, newPassword: string): Promise<{ message: string }> => {
  return post<{ message: string }>(`/auth/reset-password?token=${encodeURIComponent(token)}&new_password=${encodeURIComponent(newPassword)}`);
};
