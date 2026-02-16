import api from './api';

export const studentService = {
  getDashboard: async () => {
    const response = await api.get('/student/dashboard');
    return response.data;
  },
  getInternships: async () => {
    const response = await api.get('/student/internships');
    return response.data;
  },

  applyInternship: async (internshipId) => {
    const response = await api.post(`/student/apply/${internshipId}`);
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
