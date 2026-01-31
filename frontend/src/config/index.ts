/**
 * Application configuration
 * All environment variables and app settings centralized here
 */

export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    timeout: 30000, // 30 seconds
  },
  
  // App Info
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Praktiki',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  
  // Auth Configuration
  auth: {
    tokenKey: 'praktiki_token',
    userKey: 'praktiki_user',
    roleKey: 'praktiki_role',
  },
  
  // Feature Flags
  features: {
    enableAnalytics: import.meta.env.PROD,
    enableDebugLogs: import.meta.env.DEV,
  },
} as const;

export default config;
