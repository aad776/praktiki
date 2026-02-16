import React, { useEffect, useState, useRef } from 'react';
import { instituteService } from '../services/instituteService';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, Image, Filter, LogOut, Bell } from 'lucide-react';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { toPng } from 'html-to-image';

const InstituteDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const dashboardRef = useRef(null);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({
      startDate: '',
      endDate: '',
      policy: 'ALL'
  });

  useEffect(() => {
    loadData();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [filters]); 

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await instituteService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await instituteService.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (error) {
      console.error('Failed to mark notifications read', error);
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const loadData = async () => {
    try {
      const [statsData, appsData, pendingData] = await Promise.all([
          instituteService.getAnalytics(filters),
          instituteService.getApplications(),
          instituteService.getPendingReviews()
      ]);
      setStats(statsData);
      setApplications(appsData);
      setPendingReviews(pendingData);
    } catch (error) {
      console.error(error);
      setMessage('Failed to load analytics');
    }
  };

  const handleApprove = async (appId) => {
    try {
      await instituteService.approveCredits(appId);
      setMessage('Credits approved successfully');
      loadData();
    } catch (error) {
      console.error("Approval failed", error);
      setMessage('Failed to approve credits');
    }
  };


  const handleReject = async (appId) => {
      const reason = prompt("Enter rejection reason (Mandatory):");
      if (!reason) return;
      
      try {
          await instituteService.rejectCredits(appId, reason);
          setMessage('Credits rejected');
          loadData();
      } catch (err) {
          setMessage('Failed to reject credits');
      }
  };

  const handleException = async (appId) => {
      const reason = prompt("Enter exception remarks (Mandatory):");
      if (!reason) return;

      try {
          await instituteService.markException(appId, reason);
          setMessage('Application marked as exception');
          loadData();
      } catch (err) {
          setMessage('Failed to mark exception');
      }
  };

  const handleDownload = async (type) => {
    try {
      if (type === 'image') {
          if (dashboardRef.current) {
            try {
              const dataUrl = await toPng(dashboardRef.current, {
                backgroundColor: '#ffffff', 
                filter: (node) => !node.classList?.contains('no-print') 
              });
              
              const link = document.createElement('a');
              link.href = dataUrl;
              link.download = 'dashboard_snapshot.png';
              document.body.appendChild(link);
              link.click();
              link.remove();
            } catch (err) {
              console.error('Failed to generate image', err);
              setMessage('Failed to generate image');
            }
          }
          return;
      }

      let blob;
      let filename;
      
      if (type === 'csv') {
          blob = await instituteService.downloadCSV(filters);
          filename = 'credits_report.csv';
      } else if (type === 'pdf') {
          blob = await instituteService.downloadPDF(filters);
          filename = 'credits_report.pdf';
      }

      if (blob) {
          const url = window.URL.createObjectURL(new Blob([blob]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
      }
    } catch (error) {
      console.error("Download failed", error);
      setMessage('Download failed');
    }
  };

  const handleFilterChange = (e) => {
      const { name, value } = e.target;
      setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleBackToMain = () => {
    window.location.href = 'http://localhost:5173/institute'; // Main portal port
  };

  return (
    <div className="space-y-8" ref={dashboardRef}>

      {/* Header with Logout */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm no-print">
        <div className="flex items-center gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Institute ABC Analytics</h1>
                <p className="text-sm text-gray-500">View aggregated application statistics (Restricted View)</p>
            </div>
            <button 
              onClick={handleBackToMain}
              className="text-sm bg-orange-50 text-orange-600 px-3 py-1 rounded-full border border-orange-100 hover:bg-orange-100 transition-colors flex items-center gap-1.5"
            >
              Back to Praktiki
            </button>
        </div>
        <div className="flex items-center gap-4">
          {/* Notifications UI */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setNotifOpen(!notifOpen)}
              className={`p-2 rounded-lg transition-colors relative ${notifOpen ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-4 transition-colors ${notif.is_read === 0 ? 'bg-orange-50/30' : 'hover:bg-gray-50'}`}
                        >
                          <p className={`text-sm ${notif.is_read === 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                            {notif.message}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1.5">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
               onClick={handleLogout} 
               className="flex items-center gap-2 text-red-600 hover:text-red-800 transition-colors px-3 py-1 rounded-md hover:bg-red-50"
          >
               <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {message && <div className="p-4 bg-blue-100 text-blue-700 rounded">{message}</div>}
      
      {/* Credit Policy Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 no-print shadow-sm">
        <h3 className="text-lg font-bold text-blue-800 mb-2">Credit Policy Rules</h3>
        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
            <li><strong>AICTE:</strong> 40 Hours = 1 Credit</li>
            <li><strong>UGC:</strong> 30 Hours = 1 Credit</li>
            <li><strong>Minimum Credits Required per Internship:</strong> 2</li>
        </ul>
      </div>

      {/* Privacy Notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 no-print">
        <div className="flex">
            <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            </div>
            <div className="ml-3">
            <p className="text-sm text-yellow-700">
                <strong>Data Privacy Enabled:</strong> Access to individual student details and application status is restricted. You can only view aggregated statistics for your institute.
            </p>
            </div>
        </div>
      </div>

      {/* Pending Reviews Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden no-print">
        <div className="px-6 py-4 border-b border-gray-200 bg-orange-50">
            <h3 className="text-lg font-bold text-gray-800">Pending Credit Approvals</h3>
            <p className="text-sm text-gray-600">Provisional Internship Hours (System Generated)</p>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provisional Hours</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {pendingReviews.map((app) => {
                        // Calculate Credits for Display
                        const hours = app.hours_worked || 0;
                        const policy = app.internship?.policy || 'UGC';
                        const divisor = policy === 'AICTE' ? 40 : 30;
                        const credits = (hours / divisor).toFixed(2);
                        const isLowCredits = credits < 2;

                        return (
                        <tr key={app.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {app.student?.username} <br/>
                                <span className="text-xs text-gray-500">{app.student?.email}</span>
                                {app.student?.apaar_id && (
                                    <div className="text-[10px] text-blue-600 font-bold mt-1">APAAR: {app.student.apaar_id}</div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.internship?.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.internship?.company?.username || 'Unknown'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${app.internship?.policy === 'UGC' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {app.internship?.policy}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="font-bold text-blue-600">{hours} Hours</span>
                                <div className="text-xs text-gray-400 mt-1">
                                    {credits} Credits
                                    {isLowCredits && <span className="text-red-500 ml-1 font-bold">(Low)</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                <button 
                                    onClick={() => handleApprove(app.id)}
                                    className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold hover:bg-green-200"
                                >
                                    Approve
                                </button>
                                <button 
                                    onClick={() => handleException(app.id)}
                                    className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold hover:bg-yellow-200"
                                >
                                    Exception
                                </button>
                                <button 
                                    onClick={() => handleReject(app.id)}
                                    className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold hover:bg-red-200"
                                >
                                    Reject
                                </button>
                            </td>
                        </tr>
                        );
                    })}
                    {pendingReviews.length === 0 && (
                        <tr>
                            <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No pending approvals</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <div className="flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold text-gray-800">Analytics & Reports</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => handleDownload('csv')}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            <Download size={16} />
            <span>CSV</span>
          </button>
          <button 
            onClick={() => handleDownload('pdf')}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            <FileText size={16} />
            <span>PDF</span>
          </button>
          <button 
            onClick={() => handleDownload('image')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            <Image size={16} />
            <span>Image</span>
          </button>
        </div>
      </div>

      {/* Student Credits Table (Read-Only) */}
      <div className="bg-white shadow rounded-lg overflow-hidden no-print">
        <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Student Credits (Read-Only)</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits Awarded</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((app) => (
                        <tr key={app.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {app.student?.username}
                                {app.student?.apaar_id && (
                                    <div className="text-[10px] text-blue-600 font-bold">APAAR: {app.student.apaar_id}</div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.student?.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.internship?.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{app.credits_awarded || '-'}</td>
                        </tr>
                    ))}
                    {(!applications || applications.length === 0) && (
                        <tr>
                            <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No records found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2 text-gray-600">
              <Filter size={20} />
              <span className="font-semibold">Filters:</span>
          </div>
          <div>
              <input 
                  type="date" 
                  name="startDate" 
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="border rounded px-3 py-1" 
              />
              <span className="mx-2 text-gray-400">to</span>
              <input 
                  type="date" 
                  name="endDate" 
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="border rounded px-3 py-1" 
              />
          </div>
          <div>
              <select 
                  name="policy" 
                  value={filters.policy} 
                  onChange={handleFilterChange}
                  className="border rounded px-3 py-1 bg-white"
              >
                  <option value="ALL">All Policies</option>
                  <option value="UGC">UGC</option>
                  <option value="AICTE">AICTE</option>
              </select>
          </div>
      </div>

      {stats && (
        <>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                <h3 className="text-gray-500 text-sm">Total Approved Credits</h3>
                <p className="text-3xl font-bold">{stats.total_credits}</p>
                <div className="text-xs text-gray-400 mt-1">
                    {stats.approved} requests approved
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
                <h3 className="text-gray-500 text-sm">Active Internships</h3>
                <p className="text-3xl font-bold text-indigo-600">{stats.active_internships}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <h3 className="text-gray-500 text-sm">UGC Policy</h3>
                <p className="text-3xl font-bold text-green-600">{stats.ugc_count}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                <h3 className="text-gray-500 text-sm">AICTE Policy</h3>
                <p className="text-3xl font-bold text-purple-600">{stats.aicte_count}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                <h3 className="text-gray-500 text-sm">Exceptions</h3>
                <p className="text-3xl font-bold text-yellow-600">{stats.exceptions}</p>
            </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bar Chart: Policy Distribution */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Policy-wise Credits</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.policy_stats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#8884d8" name="Credits" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Line Chart: Month-wise Trend */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Monthly Credit Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.monthly_stats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="credits" stroke="#82ca9d" name="Credits Issued" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default InstituteDashboard;
