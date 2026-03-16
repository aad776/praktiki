import React, { useEffect, useState, useRef } from 'react';
import { companyService } from '../services/companyService';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, LogOut, XCircle, ChevronDown, ChevronUp, Calendar, Clock, BookOpen, Bell, ArrowLeft } from 'lucide-react';

const REJECTION_REASONS = [
  "Not suitable for this role",
  "Position filled",
  "Insufficient experience",
  "Skillset mismatch",
  "Other"
];

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [applications, setApplications] = useState([]);
  const [newInternship, setNewInternship] = useState({ 
      title: '', 
      description: '', 
      duration: '', 
      expected_hours: '', 
      policy: 'UGC', 
      start_date: '', 
      end_date: '' 
  });
  const [completionData, setCompletionData] = useState({}); // { appId: { hours: 0 } }
  const [message, setMessage] = useState('');
  
  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Rejection Modal State
  const [rejectModal, setRejectModal] = useState({ isOpen: false, appId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  
  // Expanded Student Details
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    loadApplications();
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
      const data = await companyService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await companyService.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (error) {
      console.error('Failed to mark notifications read', error);
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const loadApplications = async () => {
    try {
      const data = await companyService.getApplications();
      setApplications(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePostInternship = async (e) => {
    e.preventDefault();
    try {
      await companyService.postInternship(newInternship);
      setMessage('Internship posted successfully!');
      setNewInternship({ 
          title: '', description: '', duration: '', expected_hours: '', 
          policy: 'UGC', start_date: '', end_date: '' 
      });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to post internship');
    }
  };

  const handleComplete = async (appId) => {
    const data = completionData[appId];
    if (!data || !data.hours) return alert("Please enter hours");
    
    try {
      await companyService.completeInternship(appId, parseInt(data.hours));
      setMessage('Internship processed successfully!');
      loadApplications();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setMessage('Failed to complete');
    }
  };

  const openRejectModal = (appId) => {
    setRejectModal({ isOpen: true, appId });
    setRejectReason(REJECTION_REASONS[0]);
    setCustomReason('');
  };

  const handleReject = async () => {
    const reason = rejectReason === 'Other' ? customReason : rejectReason;
    if (!reason) return alert("Please provide a rejection reason");

    try {
      await authService.rejectApplication(rejectModal.appId, reason);
      setMessage('Application rejected successfully');
      setRejectModal({ isOpen: false, appId: null });
      loadApplications();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setMessage('Failed to reject application');
    }
  };

  const updateCompletionData = (appId, field, value) => {
    setCompletionData(prev => ({
      ...prev,
      [appId]: { ...prev[appId], [field]: value }
    }));
  };

  const toggleRow = (appId) => {
    setExpandedRows(prev => ({ ...prev, [appId]: !prev[appId] }));
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Summary Stats
  const totalApplicants = applications.length;
  const completedInternships = applications.filter(a => a.status === 'completed' || a.status === 'institute_review').length;

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 sm:p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Back Arrow - Only visible on Mobile */}
          <button 
            onClick={() => window.history.back()}
            className="sm:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Company Portal</h2>
        </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            {/* Notification Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className={`p-2.5 rounded-lg transition-colors relative ${notifOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Bell size={24} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
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
                            className={`p-4 transition-colors ${notif.is_read === 0 ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
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
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm sm:text-base"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 pb-3 overflow-x-auto scrollbar-hide">
        <button 
          className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm sm:text-base transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-lg scale-[1.02] font-bold' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-medium'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Manage Applications
        </button>
        <button 
          className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm sm:text-base transition-all ${activeTab === 'post' ? 'bg-slate-900 text-white shadow-lg scale-[1.02] font-bold' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-medium'}`}
          onClick={() => setActiveTab('post')}
        >
          Post Internship
        </button>
      </div>

      {message && <div className={`p-4 rounded ${message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center border-l-4 border-blue-500 transition-all hover:shadow-md">
            <div className="p-2.5 rounded-full bg-blue-100 text-blue-600 mr-3">
                <Users size={20} />
            </div>
            <div>
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Total Applicants</h3>
                <p className="text-xl font-black text-gray-800 leading-none mt-1">{totalApplicants}</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center border-l-4 border-emerald-500 transition-all hover:shadow-md">
            <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-600 mr-3">
                <CheckCircle size={20} />
            </div>
            <div>
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Reviewed</h3>
                <p className="text-xl font-black text-gray-800 leading-none mt-1">{completedInternships}</p>
            </div>
        </div>
      </div>

      {activeTab === 'post' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full animate-fadeIn">
          <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-gray-800">
            <BookOpen size={18} className="text-blue-600" /> Post New Internship
          </h3>
          <form onSubmit={handlePostInternship} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Internship Title</label>
              <input 
                type="text" 
                className="block w-full border border-gray-200 rounded-lg bg-gray-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all outline-none"
                value={newInternship.title}
                onChange={e => setNewInternship({...newInternship, title: e.target.value})}
                required
                placeholder="e.g. Full Stack Web Development"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Duration</label>
                    <input 
                        type="text" 
                        className="block w-full border border-gray-200 rounded-lg bg-gray-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all outline-none"
                        value={newInternship.duration}
                        onChange={e => setNewInternship({...newInternship, duration: e.target.value})}
                        required
                        placeholder="e.g. 3 Months"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Expected Hours</label>
                    <input 
                        type="number" 
                        className="block w-full border border-gray-200 rounded-lg bg-gray-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all outline-none"
                        value={newInternship.expected_hours}
                        onChange={e => setNewInternship({...newInternship, expected_hours: e.target.value})}
                        required
                        placeholder="Total working hours"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Credit Policy</label>
                    <select 
                        className="block w-full border border-gray-200 rounded-lg bg-gray-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all outline-none cursor-pointer"
                        value={newInternship.policy}
                        onChange={e => setNewInternship({...newInternship, policy: e.target.value})}
                    >
                        <option value="UGC">UGC (30 Hrs = 1 Credit)</option>
                        <option value="AICTE">AICTE (40 Hrs = 1 Credit)</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
                    <input 
                        type="date" 
                        className="block w-full border border-gray-200 rounded-lg bg-gray-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all outline-none"
                        value={newInternship.start_date}
                        onChange={e => setNewInternship({...newInternship, start_date: e.target.value})}
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
                    <input 
                        type="date" 
                        className="block w-full border border-gray-200 rounded-lg bg-gray-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all outline-none"
                        value={newInternship.end_date}
                        onChange={e => setNewInternship({...newInternship, end_date: e.target.value})}
                        required
                    />
                </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
              <textarea 
                className="block w-full border border-gray-200 rounded-lg bg-gray-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all outline-none"
                rows="4"
                value={newInternship.description}
                onChange={e => setNewInternship({...newInternship, description: e.target.value})}
                required
                placeholder="Describe the internship role and responsibilities..."
              />
            </div>

            <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  Create Internship Opportunity
                </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100 animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Institute</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Internship</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applied</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {applications.map((app) => (
                  <React.Fragment key={app.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center cursor-pointer group" onClick={() => toggleRow(app.id)}>
                          <div className={`p-1 rounded transition-colors ${expandedRows[app.id] ? 'bg-blue-50 text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                            {expandedRows[app.id] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                          </div>
                          <div className="ml-2">
                              <div className="font-bold text-gray-800">{app.student?.username}</div>
                              <div className="text-[10px] text-gray-400 font-medium">{app.student?.email}</div>
                          </div>
                        </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 font-medium">
                        {app.student?.institute_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        <div className="font-bold text-gray-700">{app.internship?.title}</div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Policy: {app.internship?.policy || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-medium">
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 inline-flex text-[9px] font-black uppercase rounded-full 
                        ${app.status === 'completed' || app.status === 'institute_review' ? 'bg-emerald-100 text-emerald-700' : 
                          app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                      {app.status === 'applied' && (
                        <div className="flex space-x-2">
                            <button 
                                onClick={async () => {
                                    try {
                                        await companyService.acceptApplication(app.id);
                                        loadApplications();
                                        setMessage('Application accepted successfully!');
                                        setTimeout(() => setMessage(''), 3000);
                                    } catch(e) { 
                                        setMessage('Failed to accept application');
                                        setTimeout(() => setMessage(''), 3000);
                                    }
                                }}
                                className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all shadow-sm active:scale-[0.98]"
                            >
                                Accept
                            </button>
                            <button 
                                onClick={() => openRejectModal(app.id)}
                                className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all shadow-sm active:scale-[0.98]"
                            >
                                Reject
                            </button>
                        </div>
                      )}

                      {app.status === 'accepted' && (
                        <div className="flex items-center space-x-2">
                             <input 
                                type="number" 
                                placeholder="Hrs" 
                                min="0"
                                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-100 outline-none"
                                onChange={(e) => updateCompletionData(app.id, 'hours', e.target.value)}
                              />
                             <button 
                                onClick={() => handleComplete(app.id)}
                                className="text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all shadow-sm active:scale-[0.98] whitespace-nowrap"
                            >
                                Mark Complete
                            </button>
                        </div>
                      )}

                      {(app.status === 'completed' || app.status === 'institute_review') && (
                        <span className="text-emerald-600 font-bold text-[10px] uppercase flex items-center gap-1">
                          <CheckCircle size={12} /> Processed
                        </span>
                      )}

                      {app.status === 'rejected' && (
                        <span className="text-red-500 text-[10px] font-bold uppercase flex items-center gap-1" title={app.rejection_reason}>
                          <XCircle size={12} /> Rejected
                        </span>
                      )}
                    </td>
                  </tr>
                  {expandedRows[app.id] && (
                    <tr className="bg-gray-50/50">
                        <td colSpan="6" className="px-6 py-4 border-t border-gray-100 shadow-inner">
                            <div className="text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fadeIn">
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Student Information</h4>
                                    <p className="flex items-center gap-2"><span className="font-bold text-gray-900">{app.student?.full_name || 'N/A'}</span></p>
                                    <p className="text-gray-500 text-xs">{app.student?.email}</p>
                                    <p className="text-gray-500 text-xs">Contact: {app.student?.phone || 'N/A'}</p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Academic Context</h4>
                                    <p className="text-gray-700 text-xs font-medium">{app.student?.institute_name || 'N/A'}</p>
                                    <p className="text-gray-400 font-mono text-[10px]">APAAR ID: {app.student?.username}</p>
                                    {app.rejection_reason && (
                                      <div className="mt-3 p-2 bg-red-50 text-red-700 text-[10px] rounded-lg border border-red-100">
                                        <strong>Rejection Reason:</strong> {app.rejection_reason}
                                      </div>
                                    )}
                                </div>
                            </div>
                        </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Reject Application</h3>
                    <button onClick={() => setRejectModal({ isOpen: false, appId: null })} className="text-gray-500 hover:text-gray-700">
                        <XCircle size={24} />
                    </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">Please select a reason for rejecting this application.</p>
                
                <select 
                    className="w-full border p-2 rounded mb-4"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                >
                    {REJECTION_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>

                {rejectReason === 'Other' && (
                    <textarea 
                        className="w-full border p-2 rounded mb-4"
                        placeholder="Enter specific reason..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        rows="3"
                    />
                )}

                <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => setRejectModal({ isOpen: false, appId: null })}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleReject}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Confirm Rejection
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;
