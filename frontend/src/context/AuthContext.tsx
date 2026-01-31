import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import api, { setAuthToken, clearAuthToken } from '../lib/api';
import { config } from '../config';

// Types
export type Role = 'student' | 'employer' | 'institute' | null;

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_email_verified: boolean;
}

interface DecodedToken {
  sub?: string;
  role?: Role;
  exp?: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  role: Role;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, role: Role) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Helper functions
function isTokenValid(token: string): boolean {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (!decoded.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    // Add 60 second buffer for clock skew
    return decoded.exp > now + 60;
  } catch {
    return false;
  }
}

function getStoredAuth(): { token: string | null; role: Role } {
  const token = localStorage.getItem(config.auth.tokenKey);
  const role = localStorage.getItem(config.auth.roleKey) as Role;
  
  if (token && isTokenValid(token)) {
    return { token, role };
  }
  
  // Clear invalid token
  clearStoredAuth();
  return { token: null, role: null };
}

function clearStoredAuth(): void {
  localStorage.removeItem(config.auth.tokenKey);
  localStorage.removeItem(config.auth.userKey);
  localStorage.removeItem(config.auth.roleKey);
}

// Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    role: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Fetch user profile based on role
  const fetchUserProfile = useCallback(async (role: Role): Promise<User | null> => {
    try {
      // For now, we construct user from the profile endpoint based on role
      // In production, you might have a dedicated /auth/me endpoint
      let userData: User | null = null;
      
      if (role === 'student') {
        const response = await api.get('/students/me');
        const profile = response.data;
        userData = {
          id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          role: 'student',
          is_email_verified: true,
        };
      } else if (role === 'employer') {
        const response = await api.get('/employers/profile');
        const profile = response.data;
        userData = {
          id: profile.id,
          email: profile.email || '',
          full_name: profile.company_name || '',
          role: 'employer',
          is_email_verified: true,
        };
      } else if (role === 'institute') {
        const response = await api.get('/institutes/profile');
        const profile = response.data;
        userData = {
          id: profile.id,
          email: profile.email || '',
          full_name: profile.institute_name || '',
          role: 'institute',
          is_email_verified: true,
        };
      }
      
      return userData;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }, []);

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      const { token, role } = getStoredAuth();
      
      if (token && role) {
        setAuthToken(token);
        
        // Try to fetch user profile
        const user = await fetchUserProfile(role);
        
        setState({
          token,
          user,
          role,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({
          token: null,
          user: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, [fetchUserProfile]);

  // Login function
  const login = useCallback(async (token: string, role: Role) => {
    // Store auth data
    localStorage.setItem(config.auth.tokenKey, token);
    if (role) localStorage.setItem(config.auth.roleKey, role);
    setAuthToken(token);

    // Fetch user profile
    const user = await fetchUserProfile(role);

    setState({
      token,
      user,
      role,
      isAuthenticated: true,
      isLoading: false,
    });
  }, [fetchUserProfile]);

  // Logout function
  const logout = useCallback(() => {
    clearStoredAuth();
    clearAuthToken();
    
    setState({
      token: null,
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (state.role) {
      const user = await fetchUserProfile(state.role);
      setState(prev => ({ ...prev, user }));
    }
  }, [state.role, fetchUserProfile]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
