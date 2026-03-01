import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Building, School, ClipboardList, AlertTriangle, FileText, Activity, Download, Eye, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    total_students: 0,
    total_companies: 0,
    total_institutes: 0,
    total_internships: 0,
    total_credits_issued: 0,
    pending_institute_reviews: 0,
    exceptions_count: 0,
    rejected_credits_count: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [internships, setInternships] = useState([]);
  const [analytics, setAnalytics] = useState({
    policy_distribution: [],
    monthly_trends: [],
    institute_activity: []
  });
  const [message, setMessage] = useState('');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (activeTab === 'students' && students.length === 0) {
          const data = await adminService.getUsersByRole('student');
          setStudents(data);
        } else if (activeTab === 'companies' && companies.length === 0) {
          const data = await adminService.getUsersByRole('company');
          setCompanies(data);
        } else if (activeTab === 'institutes' && institutes.length === 0) {
          const data = await adminService.getUsersByRole('institute');
          setInstitutes(data);
        } else if (activeTab === 'internships' && internships.length === 0) {
            const data = await adminService.getAllInternships();
            setInternships(data);
        } else if (activeTab === 'analytics' && analytics.policy_distribution.length === 0) {
            const data = await adminService.getAnalytics();
            setAnalytics(data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [appData, statsData] = await Promise.all([
        adminService.getAllApplications(),
        adminService.getDashboardStats()
      ]);
      setApplications(appData);
      setStats(statsData);
    } catch (error) {
      console.error(error);
      setMessage('Failed to load dashboard data');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleDownloadSummary = async () => {
      try {
          await adminService.downloadSystemSummary();
      } catch (error) {
          console.error("Download failed", error);
          setMessage("Failed to download summary");
      }
  };

  const handleDownloadLogs = async () => {
      try {
          await adminService.downloadAuditLogs();
      } catch (error) {
          console.error("Download failed", error);
          setMessage("Failed to download logs");
      }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header with Logout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Back Arrow - Only visible on Mobile */}
            <button 
              onClick={() => window.history.back()}
              className="sm:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              aria-label="Go back"
            >
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Portal</h2>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide">Read-Only Mode</span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      {message && <div className="p-4 bg-blue-100 text-blue-700 rounded">{message}</div>}

      {/* Tabs */}
      <div className="flex space-x-2 sm:space-x-4 border-b overflow-x-auto scrollbar-hide">
        {[
            { id: 'overview', label: 'Overview' },
            { id: 'students', label: 'Students' },
            { id: 'companies', label: 'Companies' },
            { id: 'institutes', label: 'Institutes' },
            { id: 'internships', label: 'Internships' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'exports', label: 'Exports' }
        ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 px-3 sm:px-4 whitespace-nowrap text-sm sm:text-base transition-colors ${
                    activeTab === tab.id 
                    ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                {tab.label}
            </button>
        ))}
      </div>

      {activeTab === 'overview' && (
      <div className="space-y-6 animate-fadeIn w-full">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600 mr-4">
                <Users size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">Total Students</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total_students}</p>
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 bg-indigo-100 rounded-full text-indigo-600 mr-4">
                <Building size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">Companies</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total_companies}</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 bg-purple-100 rounded-full text-purple-600 mr-4">
                <School size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">Institutes</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total_institutes}</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 bg-green-100 rounded-full text-green-600 mr-4">
                <FileText size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">Internships Posted</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total_internships}</p>
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full text-yellow-600 mr-4">
                <Activity size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">Credits Issued</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total_credits_issued}</p>
            </div>
        </div>
      </div>

      {/* Exceptions & Flags Section */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-600" />
            <h3 className="text-lg font-bold text-red-800">Exceptions & Flags (Observation Only)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-md shadow-sm border border-red-100">
                <p className="text-sm text-gray-500">Rejected Credits</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected_credits_count}</p>
                <p className="text-xs text-gray-400 mt-1">Requires Institute Review</p>
            </div>
            <div className="bg-white p-4 rounded-md shadow-sm border border-red-100">
                <p className="text-sm text-gray-500">Exceptions Marked</p>
                <p className="text-2xl font-bold text-orange-600">{stats.exceptions_count}</p>
                <p className="text-xs text-gray-400 mt-1">Low Hours / Missing Proof</p>
            </div>
            <div className="bg-white p-4 rounded-md shadow-sm border border-red-100">
                <p className="text-sm text-gray-500">Pending Reviews</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending_institute_reviews}</p>
                <p className="text-xs text-gray-400 mt-1">Institute Action Required</p>
            </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Recent Credit Activity</h3>
        </div>
        
        {applications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No activity yet</div>
        ) : (
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institute</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {applications.slice(0, 10).map((app) => (
                <tr key={app.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{app.student?.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.student?.institute_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.policy_used || app.internship?.policy || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${app.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              app.status === 'exception' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'}`}>
                            {app.status.replace('_', ' ').toUpperCase()}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.credits_awarded ? app.credits_awarded : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        Read Only
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        )}
      </div>
      </div>
      )}

      {activeTab === 'internships' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">Internship Observation</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {internships.map((internship) => (
                        <tr key={internship.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{internship.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{internship.company_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{internship.policy}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${internship.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {internship.status.toUpperCase()}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500">
                                <Eye size={16} className="cursor-not-allowed opacity-50" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
      )}

      {activeTab === 'analytics' && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Policy Distribution */}
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Policy Distribution (Credits)</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analytics.policy_distribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {analytics.policy_distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Monthly Trends */}
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Internship Applications Trend</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.monthly_trends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottom', offset: -5 }} />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="count" fill="#8884d8" name="Applications" />
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              {/* Institute Activity */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Top Institutes by Credits</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.institute_activity} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={150} />
                            <RechartsTooltip />
                            <Bar dataKey="credits" fill="#82ca9d" name="Credits Approved" />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'exports' && (
          <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 mb-6">System Reports & Exports</h3>
              <p className="text-gray-500 mb-8">Download read-only reports for system auditing and offline analysis.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                              <Activity size={24} />
                          </div>
                          <h4 className="font-bold text-gray-800">System Summary Report</h4>
                      </div>
                      <p className="text-sm text-gray-500 mb-6">
                          Comprehensive overview of all platform statistics, including student counts, company participation, and credit totals.
                      </p>
                      <button 
                        onClick={handleDownloadSummary}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                          <Download size={18} /> Download CSV
                      </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                              <ClipboardList size={24} />
                          </div>
                          <h4 className="font-bold text-gray-800">Audit Logs Export</h4>
                      </div>
                      <p className="text-sm text-gray-500 mb-6">
                          Detailed log of all critical system actions including logins, credit approvals, and exceptions. Read-only format.
                      </p>
                      <button 
                        onClick={handleDownloadLogs}
                        className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                          <Download size={18} /> Download Logs
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Reuse existing tables for Students, Companies, Institutes but ensure Read-Only visual cues */}
      {activeTab === 'students' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Registered Students</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Read Only</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institute</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.institute_name || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {user.is_verified ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Verified</span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Unverified</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Registered Companies</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Read Only</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {companies.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {user.is_verified ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Verified</span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Unverified</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'institutes' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Registered Institutes</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Read Only</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institute Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {institutes.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.institute_name || user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {user.is_verified ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Verified</span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Unverified</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
