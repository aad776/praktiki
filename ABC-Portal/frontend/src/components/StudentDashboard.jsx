
import React, { useEffect, useState, useContext, useRef } from 'react';
import { studentService } from '../services/studentService';
import { authService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle, Clock, PieChart as PieIcon, LogOut, User, AlertTriangle, FileText, Info, CreditCard, Fingerprint, Bell } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [internships, setInternships] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedInternship, setSelectedInternship] = useState(null);

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    loadDashboard();
    loadInternships();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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
      const data = await studentService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await studentService.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (error) {
      console.error('Failed to mark notifications read', error);
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const loadDashboard = async () => {
    try {
      const data = await studentService.getDashboard();
      setStats(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadInternships = async () => {
    try {
      const data = await studentService.getInternships();
      setInternships(data);
    } catch (error) {
      console.error(error);
    }
  };

  const apply = async (id) => {
    try {
      await studentService.applyInternship(id);
      setMessage('Application submitted successfully!');
      loadDashboard();
      loadInternships(); // Refresh to update button status
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to apply: ' + (error.response?.data?.detail || 'Unknown error'));
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Prepare Pie Chart Data
  const getPieData = () => {
    if (!stats || !stats.credits) return [];
    
    // Group credits by policy
    const policyCount = stats.credits.reduce((acc, curr) => {
        if (curr.status?.toLowerCase() === 'approved') {
            const policy = curr.policy_type || 'UGC';
            acc[policy] = (acc[policy] || 0) + curr.credits_calculated;
        }
        return acc;
    }, {});

    return Object.keys(policyCount).map(key => ({
        name: key,
        value: policyCount[key]
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const pieData = getPieData();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleBackToMain = () => {
    window.location.href = 'http://localhost:5173/student'; // Main portal port
  };

  // Helpers
  const getStatusColor = (status) => {
      switch(status) {
          case 'applied': return 'bg-blue-100 text-blue-800';
          case 'accepted': return 'bg-yellow-100 text-yellow-800'; // Company accepted, in progress
          case 'institute_review': return 'bg-purple-100 text-purple-800';
          case 'completed': return 'bg-green-100 text-green-800';
          case 'rejected': return 'bg-red-100 text-red-800';
          case 'exception': return 'bg-orange-100 text-orange-800';
          default: return 'bg-gray-100 text-gray-800';
      }
  };

  const getStatusLabel = (status) => {
      switch(status) {
          case 'applied': return 'PENDING REVIEW';
          case 'accepted': return 'IN PROGRESS';
          case 'institute_review': return 'COMPLETED (Review Pending)';
          case 'completed': return 'CONFIRMED';
          case 'rejected': return 'REJECTED';
          case 'exception': return 'EXCEPTION';
          default: return status.toUpperCase();
      }
  };

  return (
    <div className="space-y-6">
      {/* Header with Logout */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Student Portal</h2>
          <button 
            onClick={handleBackToMain}
            className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            <Briefcase size={14} /> Back to Praktiki
          </button>
        </div>
        <div className="flex items-center gap-4">
          {/* Notification Dropdown */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setNotifOpen(!notifOpen)}
              className={`p-2 rounded-lg transition-colors relative ${notifOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-gray-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-4 transition-colors ${notif.is_read === 0 ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                        >
                          <p className={`text-sm ${notif.is_read === 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                            {notif.message}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-2 flex items-center">
                            <Clock size={12} className="mr-1" />
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <Bell size={40} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-400 text-sm">No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b overflow-x-auto">
        <button 
          className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          My Applications
        </button>
        <button 
          className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'internships' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('internships')}
        >
          Available Internships
        </button>
        <button 
          className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'credits' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('credits')}
        >
          My Credits
        </button>
      </div>

      {message && <div className={`p-4 rounded ${message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}
      
      {/* STUDENT CREDENTIALS SECTION (Requested to be shown only here) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-lg text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Academic Identity</p>
              <h3 className="text-xl font-bold">APAAR ID</h3>
            </div>
            <Fingerprint className="text-blue-200 opacity-50" size={32} />
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
            <p className="text-2xl font-mono tracking-widest text-center">
              {user?.apaar_id ? user.apaar_id.replace(/(\d{4})/g, '$1 ').trim() : 'NOT LINKED'}
            </p>
          </div>
          <p className="mt-4 text-sm text-blue-100 flex items-center gap-2">
            <CheckCircle size={14} className={user?.is_apaar_verified ? "text-green-300" : "text-amber-300"} />
            {user?.is_apaar_verified ? 'Verified Identity' : 'Verification Pending'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">Academic Credit Bank</p>
              <h3 className="text-xl font-bold">Total Credits</h3>
            </div>
            <CreditCard className="text-emerald-200 opacity-50" size={32} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold">{stats?.total_credits || 0}</span>
            <span className="text-emerald-100 text-lg">Credits</span>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
              <CheckCircle size={14} />
              <span>{stats?.applications.filter(app => app.status === 'completed').length || 0} Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* CREDIT SUMMARY CARDS (Moved from Main Portal) */}
      {stats && stats.credit_summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Credits</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.credit_summary.total_credits}</p>
                </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 rounded-xl bg-green-50 text-green-600">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Approved</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.credit_summary.approved_credits}</p>
                </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                    <Clock size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.credit_summary.pending_credits}</p>
                </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                    <PieIcon size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Working Hours</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.credit_summary.total_hours}h</p>
                </div>
            </div>
        </div>
      )}

      {/* STATUS ALERTS SECTION */}
      {stats && (
        <div className="grid grid-cols-1 gap-4">
             {stats.applications.some(app => app.status === 'rejected') && (
                 <div className="bg-red-50 border-l-4 border-red-500 p-4">
                     <div className="flex">
                         <div className="flex-shrink-0">
                             <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                         </div>
                         <div className="ml-3">
                             <p className="text-sm text-red-700">
                                 You have rejected applications. Please check the "My Applications" tab for details.
                             </p>
                         </div>
                     </div>
                 </div>
             )}
             {stats.applications.some(app => app.status === 'completed') && (
                 <div className="bg-green-50 border-l-4 border-green-500 p-4">
                     <div className="flex">
                         <div className="flex-shrink-0">
                             <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                         </div>
                         <div className="ml-3">
                             <p className="text-sm text-green-700">
                                 Congratulations! You have completed internships with approved credits.
                             </p>
                         </div>
                     </div>
                 </div>
             )}
        </div>
      )}

      {/* DASHBOARD TAB (MY APPLICATIONS) */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-bold text-gray-800">My Applications</h3>
                <p className="text-sm text-gray-500">Track your application status and reviews</p>
            </div>
            
            {stats.applications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                    You haven't applied to any internships yet. Check the "Available Internships" tab.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship / Company</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied On</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks / Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {stats.applications.map((app) => (
                        <tr key={app.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{app.internship?.title}</div>
                                <div className="text-sm text-gray-500">{app.internship?.company_name || app.internship?.company?.full_name || 'Unknown Company'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(app.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(app.status)}`}>
                                {getStatusLabel(app.status)}
                            </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                {app.status === 'rejected' || app.status === 'exception' ? (
                                    <div className="text-red-600 font-semibold">
                                        <span className="block text-xs text-gray-400">Reason:</span>
                                        {app.rejection_reason || 'No reason provided'}
                                    </div>
                                ) : (
                                    <span className="text-gray-400">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                                <button onClick={() => setSelectedInternship(app)}>
                                    View Details
                                </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            )}
          </div>
        </div>
      )}

      {/* INTERNSHIPS TAB */}
      {activeTab === 'internships' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {internships.length === 0 && (
                <div className="col-span-2 text-center p-8 text-gray-500 bg-white rounded-lg shadow">
                    No active internships available at the moment.
                </div>
            )}
            {internships.map(internship => {
                const isApplied = stats?.applications?.some(app => app.internship_id === internship.id);
                const application = stats?.applications?.find(app => app.internship_id === internship.id);
                
                return (
                <div key={internship.id} className="bg-white p-6 rounded-lg shadow border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-gray-800">{internship.title}</h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${internship.policy === 'AICTE' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                {internship.policy || 'UGC'}
                            </span>
                        </div>
                        <p className="text-gray-600 mt-2 text-sm">{internship.description}</p>
                        
                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <Briefcase size={14} />
                                <span>{internship.company?.full_name || 'Company'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock size={14} />
                                <span>{internship.duration || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 col-span-2">
                                <Info size={14} />
                                <span>Exp. Hours: {internship.expected_hours} | {internship.start_date} - {internship.end_date}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t">
                        {isApplied ? (
                            <button 
                                disabled
                                className={`w-full px-4 py-2 rounded text-center cursor-not-allowed font-medium
                                    ${application?.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {getStatusLabel(application?.status)}
                            </button>
                        ) : (
                            <button 
                                onClick={() => apply(internship.id)}
                                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium shadow-sm"
                            >
                                Apply Now
                            </button>
                        )}
                    </div>
                </div>
            )})}
        </div>
      )}

      {/* CREDITS TAB */}
      {activeTab === 'credits' && stats && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-sm">Total Approved Credits</h3>
                    <p className="text-3xl font-bold text-blue-600">{stats.total_credits}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-gray-500 text-sm">Completed Internships</h3>
                    <p className="text-3xl font-bold text-green-600">
                        {stats.applications.filter(app => app.status === 'completed').length}
                    </p>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">My Credit History (Read-Only)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Considered</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits Awarded</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {stats.credits.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No approved credits yet.</td>
                                </tr>
                            ) : (
                                stats.credits.map((credit) => (
                                    <tr key={credit.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {credit.application?.internship?.title || `Internship #${credit.application_id}`}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {credit.application?.internship?.company?.full_name || 'Unknown Company'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{credit.policy_type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{credit.hours} hrs</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{credit.credits_calculated}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(credit.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${
                                                    credit.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                                    credit.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {credit.status?.toUpperCase() || 'PENDING'}
                                                </span>
                                                {credit.is_pushed_to_abc && (
                                                    <span className="px-2 inline-flex text-[10px] leading-4 font-semibold rounded-full w-fit bg-blue-100 text-blue-800 border border-blue-200">
                                                        PUSHED TO ABC
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
              </div>
          </div>
      )}

      {/* MODAL FOR DETAILS */}
      {selectedInternship && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                  <h3 className="text-2xl font-bold mb-4">{selectedInternship.internship?.title}</h3>
                  
                  <div className="space-y-3">
                      <div className="flex justify-between border-b pb-2">
                          <span className="text-gray-500">Company:</span>
                          <span className="font-medium">{selectedInternship.internship?.company?.full_name || selectedInternship.company?.full_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                          <span className="text-gray-500">Policy:</span>
                          <span className="font-medium">{selectedInternship.internship?.policy || selectedInternship.policy_used || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                          <span className="text-gray-500">Status:</span>
                          <span className={`px-2 text-xs font-semibold rounded ${getStatusColor(selectedInternship.status)}`}>
                              {getStatusLabel(selectedInternship.status)}
                          </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                          <span className="text-gray-500">Provisional Hours:</span>
                          <span className="font-medium">{selectedInternship.hours_worked || 0} hrs</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                          <span className="text-gray-500">Credits Calculated:</span>
                          <span className="font-bold text-blue-600">{selectedInternship.credits_awarded || '-'}</span>
                      </div>
                      
                      {/* Rejection Reason Section */}
                      {(selectedInternship.status === 'rejected' || selectedInternship.status === 'exception') && (
                          <div className="bg-red-50 p-3 rounded border border-red-200 mt-4">
                              <h4 className="text-red-800 font-bold text-sm mb-1">
                                  {selectedInternship.status === 'rejected' ? 'REJECTION REASON' : 'EXCEPTION REMARKS'}
                              </h4>
                              <p className="text-red-700 text-sm">
                                  "{selectedInternship.rejection_reason}"
                              </p>
                              <p className="text-red-400 text-xs mt-2 text-right">
                                  By Institute
                              </p>
                          </div>
                      )}
                  </div>

                  <div className="mt-6 flex justify-end">
                      <button 
                          onClick={() => setSelectedInternship(null)}
                          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                      >
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentDashboard;
