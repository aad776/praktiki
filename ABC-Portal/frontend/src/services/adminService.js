import api from './api';

export const adminService = {
  getDashboardStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
  getUsersByRole: async (role) => {
    const response = await api.get(`/admin/users/${role}`);
    return response.data;
  },
  getPendingApplications: async () => {
    // Deprecated: Admin sees all applications now
    const response = await api.get('/admin/applications/all');
    return response.data;
  },
  getAllApplications: async () => {
    const response = await api.get('/admin/applications/all');
    return response.data;
  },
  getAnalytics: async () => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },
  getAllInternships: async () => {
    const response = await api.get('/admin/internships/all');
    return response.data;
  },
  downloadSystemSummary: async () => {
    const response = await api.get('/admin/export/system-summary', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'system_summary.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  downloadAuditLogs: async () => {
    const response = await api.get('/admin/export/audit-logs', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'audit_logs.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
