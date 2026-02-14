import React, { useEffect, useState, useRef } from 'react';
import { companyService } from '../services/companyService';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, LogOut, XCircle, ChevronDown, ChevronUp, Calendar, Clock, BookOpen, Bell } from 'lucide-react';

const REJECTION_REASONS = [
  "Not suitable for this role",
  "Position filled",
  "Insufficient experience",
  "Skillset mismatch",
  "Other"
];

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('applications');
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
    <div className="space-y-6">
      {/* Header with Logout */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">Company Portal</h2>
          <div className="flex items-center space-x-4">
            {/* Notification Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className={`p-2 rounded-lg transition-colors relative ${notifOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
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
              className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
      </div>

      <div className="flex space-x-4 border-b">
        <button 
          className={`pb-2 ${activeTab === 'applications' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('applications')}
        >
          Enrolled / Applied Students
        </button>
        <button 
          className={`pb-2 ${activeTab === 'post' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('post')}
        >
          Post Internship
        </button>
      </div>

      {message && <div className={`p-4 rounded ${message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow flex items-center border-l-4 border-blue-500">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <Users size={24} />
            </div>
            <div>
                <h3 className="text-gray-500 text-sm">Total Applicants</h3>
                <p className="text-2xl font-bold">{totalApplicants}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex items-center border-l-4 border-green-500">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <CheckCircle size={24} />
            </div>
            <div>
                <h3 className="text-gray-500 text-sm">Completed / Reviewed</h3>
                <p className="text-2xl font-bold">{completedInternships}</p>
            </div>
        </div>
      </div>

      {activeTab === 'post' && (
        <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BookOpen size={20} /> Post New Internship
          </h3>
          <form onSubmit={handlePostInternship} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input 
                type="text" 
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={newInternship.title}
                onChange={e => setNewInternship({...newInternship, title: e.target.value})}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (e.g. 3 Months)</label>
                    <input 
                        type="text" 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={newInternship.duration}
                        onChange={e => setNewInternship({...newInternship, duration: e.target.value})}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Expected Hours</label>
                    <input 
                        type="number" 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={newInternship.expected_hours}
                        onChange={e => setNewInternship({...newInternship, expected_hours: e.target.value})}
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Policy</label>
                    <select 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={newInternship.policy}
                        onChange={e => setNewInternship({...newInternship, policy: e.target.value})}
                    >
                        <option value="UGC">UGC (30 Hrs = 1 Credit)</option>
                        <option value="AICTE">AICTE (40 Hrs = 1 Credit)</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input 
                        type="date" 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={newInternship.start_date}
                        onChange={e => setNewInternship({...newInternship, start_date: e.target.value})}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input 
                        type="date" 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={newInternship.end_date}
                        onChange={e => setNewInternship({...newInternship, end_date: e.target.value})}
                        required
                    />
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea 
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows="4"
                value={newInternship.description}
                onChange={e => setNewInternship({...newInternship, description: e.target.value})}
                required
              />
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full">Post Internship</button>
          </form>
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institute</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied On</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <React.Fragment key={app.id}>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center cursor-pointer" onClick={() => toggleRow(app.id)}>
                        {expandedRows[app.id] ? <ChevronUp size={16} className="mr-2"/> : <ChevronDown size={16} className="mr-2"/>}
                        <div>
                            <div className="font-bold">{app.student?.username}</div>
                            <div className="text-gray-500 text-xs">{app.student?.email}</div>
                        </div>
                      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {app.student?.institute_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.internship?.title}
                      <span className="block text-xs text-gray-400">Policy: {app.internship?.policy || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${app.status === 'completed' || app.status === 'institute_review' ? 'bg-green-100 text-green-800' : 
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {app.status === 'applied' && (
                      <div className="flex flex-col space-y-2">
                          {/* Approval / Rejection Logic can be added here if needed, currently Company only "Completes" or "Rejects"? 
                              Wait, usually Company needs to "Accept" first.
                              The user prompt says: "Company approves or rejects application -> Student completes -> Company marks as completed"
                              So we need an "Accept" button too?
                              Currently we have "Process" (Complete) and "Reject".
                              The "Process" action seems to be for "Marking as Completed" (end of internship).
                              If the status is 'applied', the company should "Accept" first?
                              The user flow: "Company posts -> Student applies -> Company approves/rejects -> Student completes -> Company marks completed".
                              
                              I need to add an "Accept" action!
                              Currently my code jumps from 'applied' to 'complete' (via Process button).
                              I should probably add an "Approve Application" button.
                              And then ONLY when status is 'accepted' show the "Mark Completed" inputs.
                              
                              Let's verify the user flow:
                              "Company approves or rejects application -> Student completes -> Company marks internship as completed"
                              
                              So:
                              1. Status: APPLIED -> Action: Approve / Reject
                              2. Status: ACCEPTED -> Action: Mark Completed (Input Hours)
                          */}
                          
                          {/* For now, sticking to the existing "Process" if it meant "Accept & Complete" in one go? 
                              No, that's not right. 
                              The user clearly separates "Company approves application" and "Company marks as completed".
                              
                              I should check if backend supports "Accept".
                              ApplicationStatus has ACCEPTED.
                              But I don't see an endpoint for "Accept" in company.py?
                              Let's check company.py again.
                          */}
                          
                          {/* 
                            Looking at company.py, there is NO "accept" endpoint. 
                            There is only `complete_internship` (marks as INSTITUTE_REVIEW) and `reject_application`.
                            
                            If I add an "Accept" step, I need a backend endpoint.
                            Or I can just rename "Process" to "Accept" and have a separate "Mark Complete"?
                            
                            Given the user prompt is "Company approves or rejects application", I should probably add an endpoint.
                            BUT, to avoid scope creep and breaking things now:
                            Maybe the "Process" button in my previous code was acting as "Complete".
                            
                            If I want to follow the flow exactly:
                            I need to add `accept_application` endpoint.
                            
                            For this turn, I will assume the user might be testing with "Process" (Complete) directly for simplicity, OR
                            I will add a simple "Accept" button that updates status to 'accepted'.
                            
                            Let's check if I can quickly add `accept_application` to backend.
                            Yes, I can.
                          */}
                          
                        <div className="flex space-x-2">
                           {/* Temporary: If we don't have Accept endpoint, maybe we assume "Applied" can be "Completed" directly? 
                               The user prompt implies a step in between.
                               "Student completes internship" is a real-world action, not a system state usually (unless student marks it).
                               
                               Let's stick to: 
                               If status is APPLIED: Show "Accept" and "Reject".
                               If status is ACCEPTED: Show "Mark Completed" (Hours input).
                               
                               I need to add `accept_application` to backend.
                           */}
                        </div>
                      </div>
                    )}
                    
                    {/* Re-implementing logic based on flow */}
                    
                    {app.status === 'applied' && (
                        <div className="flex space-x-2">
                            <button 
                                onClick={async () => {
                                    // I need an endpoint for this. 
                                    // For now, I'll use a specific implementation or add it.
                                    // Let's add it to backend quickly.
                                    try {
                                        await companyService.acceptApplication(app.id);
                                        loadApplications();
                                    } catch(e) { alert("Failed to accept"); }
                                }}
                                className="text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-xs"
                            >
                                Accept
                            </button>
                            <button 
                                onClick={() => openRejectModal(app.id)}
                                className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-xs"
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
                                className="w-16 border rounded px-2 py-1"
                                onChange={(e) => updateCompletionData(app.id, 'hours', e.target.value)}
                              />
                             <button 
                                onClick={() => handleComplete(app.id)}
                                className="text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-xs"
                            >
                                Mark Completed
                            </button>
                        </div>
                    )}

                    {app.status === 'rejected' && (
                        <span className="text-red-500 text-xs italic">Rejected: {app.rejection_reason}</span>
                    )}
                  </td>
                </tr>
                {expandedRows[app.id] && (
                    <tr className="bg-gray-50">
                        <td colSpan="6" className="px-6 py-4">
                            <div className="text-sm text-gray-700 grid grid-cols-2 gap-4">
                                <div>
                                    <p><strong>Full Name:</strong> {app.student?.full_name || 'N/A'}</p>
                                    <p><strong>Email:</strong> {app.student?.email}</p>
                                    <p><strong>Contact:</strong> {app.student?.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p><strong>Institute:</strong> {app.student?.institute_name || 'N/A'}</p>
                                    <p><strong>ABC ID:</strong> {app.student?.username}</p>
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