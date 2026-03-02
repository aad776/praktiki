import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      // Check for SSO token in URL
      const urlParams = new URLSearchParams(window.location.search);
      const ssoToken = urlParams.get('sso_token');
      const ssoRole = urlParams.get('sso_role');

      console.log('SSO Check - Token:', ssoToken ? 'Present' : 'Absent', 'Role:', ssoRole);

      if (ssoToken) {
        console.log('Setting SSO token in localStorage');
        localStorage.setItem('token', ssoToken);
        if (ssoRole) localStorage.setItem('role', ssoRole);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const token = localStorage.getItem('token');
      console.log('Current token in localStorage:', token ? 'Present' : 'Absent');
      if (token) {
        try {
          const userData = await authService.getCurrentUser();
          console.log('User data fetched successfully:', userData.full_name || userData.email);
          setUser({ ...userData, role: localStorage.getItem('role') }); // Ensure role is available
        } catch (error) {
          console.error("Auth check failed", error);
          authService.logout();
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  const login = async (username, password) => {
    const data = await authService.login(username, password);
    setUser({ username, role: data.role });
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
