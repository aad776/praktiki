import api from './api';

export const instituteService = {
  getPendingReviews: async () => {
    const response = await api.get('/institute/applications/pending-review');
    return response.data;
  },

  approveCredits: async (appId) => {
    const response = await api.post(`/institute/application/${appId}/approve-credits`);
    return response.data;
  },


  rejectCredits: async (appId, reason) => {
    const response = await api.post(`/institute/application/${appId}/reject-credits?reason=${reason}`);
    return response.data;
  },
  markException: async (appId, reason) => {
    const response = await api.post(`/institute/application/${appId}/mark-exception?reason=${reason}`);
    return response.data;
  },
  getAnalytics: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/analytics/institute?${params}`);
    return response.data;
  },

  downloadCSV: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/institute/export/csv?${params}`, { responseType: 'blob' });
    return response.data;
  },
  downloadPDF: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/institute/export/pdf?${params}`, { responseType: 'blob' });
    return response.data;
  },
  getApplications: async () => {
    const response = await api.get('/institute/applications');
    return response.data;
  },
  verifyHours: async (appId, data) => {
    const response = await api.put(`/institute/application/${appId}/verify-hours`, data);
    return response.data;
  },
  getNotifications: async () => {
    const response = await api.get('/notifications/');
    return response.data;
  },
  markAllNotificationsRead: async () => {
    const response = await api.post('/notifications/mark-all-read');
    return response.data;
  }
};
