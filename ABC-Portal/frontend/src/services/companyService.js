import api from './api';

export const companyService = {
  postInternship: async (data) => {
    const response = await api.post('/company/internship', data);
    return response.data;
  },
  getApplications: async () => {
    const response = await api.get('/company/applications');
    return response.data;
  },
  acceptApplication: async (appId) => {
    const response = await api.post(`/company/application/${appId}/accept`);
    return response.data;
  },

  completeInternship: async (appId, hours) => {
    // Policy is now determined by the internship settings on the backend
    const response = await api.post(`/company/application/${appId}/complete`, { hours });
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
