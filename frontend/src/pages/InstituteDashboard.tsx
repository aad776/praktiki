import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { PageLoader } from '../components/LoadingSpinner';

// Types
interface StudentInfo {
  id: number;
  name: string;
  email?: string;
  phone_number?: string;
  department?: string;
  year?: number;
  cgpa?: string;
  skills?: string;
  apaar_id?: string;
  is_apaar_verified: boolean;
  status: string;
  internships: Array<{
    id: number;
    internship_id: number;
    title: string;
    company_name: string;
    location: string;
    mode: string;
    duration_weeks: number;
    status: string;
    applied_at?: string;
    hours_worked?: number;
    policy_used?: string;
    credits_awarded?: number;
    rejection_reason?: string;
  }>;
  total_internships: number;
}

interface CreditRequest {
  id: number;
  student_id: number;
  student_name: string;
  application_id: number;
  internship_title?: string;
  company_name?: string;
  hours: number;
  credits_calculated: number;
  policy_type: string;
  status: string;
  created_at: string;
  is_pushed_to_abc?: boolean;
}

interface DashboardStats {
  total_students: number;
  active_internships: number;
  completed_internships: number;
  total_credits_approved: number;
  pending_credit_requests: number;
  policy_distribution: {
    UGC: number;
    AICTE: number;
  };
}

interface AuditLog {
  id: number;
  action: string;
  performed_by_id: number;
  target_type: string;
  target_id: number;
  details: string;
  timestamp: string;
}

export function InstituteDashboard() {
  const toast = useToast();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'completed' | 'pending' | 'credits' | 'audit' | 'status'>('students');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      const [studentsRes, creditsRes, statsRes, logsRes] = await Promise.all([
        api.get<StudentInfo[]>('/institutes/students'),
        api.get<CreditRequest[]>('/institutes/credit-requests'),
        api.get<DashboardStats>('/institutes/dashboard/stats'),
        api.get<AuditLog[]>('/institutes/audit-logs')
      ]);
      setStudents(studentsRes);
      setCreditRequests(creditsRes);
      setStats(statsRes);
      setAuditLogs(logsRes);
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to load dashboard data');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    console.log("Institute Dashboard Loaded v2.0");
    fetchData();
  }, []);

  const handleApprove = async (id: number) => {
    // Restrict approval to completed internships only
    const request = creditRequests.find(r => r.id === id);
    if (request) {
      const student = students.find(s => s.id === request.student_id);
      const application = student?.internships.find(i => i.id === request.application_id);
      
      if (application && application.status !== 'completed') {
        toast.error("Credits can only be approved for completed internships.");
        return;
      }
    }

    setActionLoading(id);
    try {
      await api.post(`/institutes/credit-requests/${id}/approve`, {});
      toast.success('Credit request approved!');
      fetchData();
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Enter reason for rejection:");
    if (!reason) return;
    
    setActionLoading(id);
    try {
      await api.post(`/institutes/credit-requests/${id}/reject`, { reason });
      toast.success('Credit request rejected');
      fetchData();
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkException = async (id: number) => {
    const reason = prompt("Enter reason for exception:");
    if (!reason) return;

    setActionLoading(id);
    try {
      await api.post(`/institutes/credit-requests/${id}/mark-exception`, { reason });
      toast.success('Marked as exception');
      fetchData();
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to mark exception');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/institutes/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `credits_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.get('/institutes/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `credits_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to export PDF');
    }
  };

  const handlePushToABC = async (id: number) => {
    // Restrict push to completed internships only
    const request = creditRequests.find(r => r.id === id);
    if (request) {
      // Find the corresponding student and application to check status
      const student = students.find(s => s.id === request.student_id);
      const application = student?.internships.find(i => i.id === request.application_id);
      
      if (application && application.status !== 'completed') {
        toast.error("Credits can only be pushed for completed internships.");
        return;
      }
    }

    setActionLoading(id);
    try {
      const response = await api.post<any>(`/institutes/credit-requests/${id}/push-to-abc`, {});
      toast.success('Credits successfully pushed to ABC simulator!');
      console.log('ABC Response:', response.abc_response);
      fetchData();
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to push credits to ABC');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.apaar_id?.includes(searchQuery)
  );

  const getInternshipsByStatus = (status: 'completed' | 'accepted' | 'pending') => {
    return students.flatMap(student => 
      student.internships
        .filter(int => {
          if (status === 'pending') {
            return int.status === 'pending' || int.status === 'applied';
          }
          return int.status === status;
        })
        .map(int => ({ 
          ...int, 
          student_name: student.name, 
          student_id: student.id,
          student_dept: student.department
        }))
    ).filter(int => 
      int.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const completedInternships = getInternshipsByStatus('completed');
  const pendingInternships = getInternshipsByStatus('pending');

  // Stats for the new header
  const totalStudents = students.length;
  const verifiedStudents = students.filter(s => s.is_apaar_verified).length;
  const pendingStudents = students.filter(s => !s.is_apaar_verified).length;
  // We don't have a rejected status for students in the current model, defaulting to 0 or checking specific flag if it existed
  const rejectedStudents = 0; 

  if (pageLoading) {
    return <PageLoader label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-8 bg-white min-h-screen p-6">
      {/* Header Section */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Institute Dashboard V2.0</h1>
          <p className="text-slate-500 mt-1 text-lg">Monitoring student internship progress.</p>
        </div>
        <div className="flex gap-3">
           <button 
            onClick={() => fetchData()}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh Data"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-200">
            <button 
              onClick={() => handleExportCSV()}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all"
            >
              CSV
            </button>
            <div className="w-px bg-slate-200 my-1 mx-1"></div>
            <button 
              onClick={() => handleExportPDF()}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all"
            >
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Stats Chips Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="p-2 bg-white rounded-full text-slate-600 shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-700">{totalStudents}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Students</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
          <div className="p-2 bg-white rounded-full text-emerald-600 shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-700">{verifiedStudents}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Verified</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
          <div className="p-2 bg-white rounded-full text-amber-600 shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-700">{pendingStudents}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
          <div className="p-2 bg-white rounded-full text-red-600 shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-700">{rejectedStudents}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rejected</p>
          </div>
        </div>
      </div>

      {/* Search Bar - Full Width */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, department, or APAAR ID"
          className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-0 text-slate-900 placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all shadow-sm"
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 pb-2 border-b border-slate-100">
        {[
          { id: 'students', label: 'Students' },
          { id: 'completed', label: 'Completed', count: completedInternships.length, color: 'emerald' },
          { id: 'pending', label: 'Pending', count: pendingInternships.length, color: 'amber' },
          { id: 'credits', label: 'Credits', count: creditRequests.filter(r => r.status === 'pending').length, color: 'blue' },
          { id: 'audit', label: 'Audit Logs' },
          { id: 'status', label: 'Status', count: students.reduce((acc, s) => acc + (s.total_internships > 0 ? 1 : 0), 0) }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
            `}
          >
            <div className="flex items-center gap-2">
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`
                  px-1.5 py-0.5 rounded-full text-xs
                  ${activeTab === tab.id 
                    ? 'bg-white/20 text-white' 
                    : `bg-${tab.color || 'slate'}-100 text-${tab.color || 'slate'}-700`}
                `}>
                  {tab.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {activeTab === 'students' ? (
        <>
          {/* Students Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-500">
                  {searchQuery ? 'No students found matching your search.' : 'No students registered yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Year
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        APAAR ID
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => (
                      <React.Fragment key={student.id}>
                        <tr 
                          className={`
                            group transition-all cursor-pointer
                            ${expandedStudentId === student.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}
                          `}
                          onClick={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`
                                p-1 rounded transition-transform duration-200 text-slate-400 group-hover:text-slate-600
                                ${expandedStudentId === student.id ? 'rotate-90 bg-slate-200' : ''}
                              `}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                              <span className="font-semibold text-slate-700 group-hover:text-slate-900">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {student.department || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {student.year ? `Year ${student.year}` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-500">
                            {student.apaar_id || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`
                                px-3 py-1 text-xs font-medium rounded-md
                                ${student.is_apaar_verified
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }
                              `}
                            >
                              {student.is_apaar_verified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                        {expandedStudentId === student.id && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={5} className="px-8 py-6 border-t border-slate-100 shadow-inner">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Student Info */}
                                <div>
                                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Contact Information</h3>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7 8.914M3 8L3 17a2 2 0 002 2h14a2 2 0 002-2V8M3 8l7-5.914M21 8l-7-5.914M10 2.086L2.172 10M14 2.086L21.828 10" />
                                      </svg>
                                      <span>{student.email || 'No email provided'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                      </svg>
                                      <span>{student.phone_number || 'No phone number'}</span>
                                    </div>
                                    <div className="pt-2">
                                      <div className="text-xs font-semibold text-slate-500 uppercase">Academic Details</div>
                                      <p className="text-sm text-slate-700 mt-1">
                                        {student.department} • Year {student.year}
                                        {student.cgpa && <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-xs font-medium">CGPA: {student.cgpa}</span>}
                                      </p>
                                    </div>
                                    {student.skills && (
                                      <div className="pt-2">
                                        <div className="text-xs font-semibold text-slate-500 uppercase">Skills</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {student.skills.split(',').map((skill, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                                              {skill.trim()}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Internship History */}
                                <div>
                                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Internship & Applications</h3>
                                  {student.internships.length === 0 ? (
                                    <p className="text-sm text-slate-500 italic">No internship records found.</p>
                                  ) : (
                                    <div className="space-y-4">
                                      {student.internships.map((int) => (
                                        <div key={int.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                          <div className="flex justify-between items-start mb-1">
                                            <div className="font-semibold text-slate-900 text-sm">{int.title}</div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                              int.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                              int.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                              int.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                              'bg-amber-100 text-amber-700'
                                            }`}>
                                              {int.status}
                                            </span>
                                          </div>
                                          <div className="text-xs text-slate-600 mb-2">{int.company_name} • {int.location} ({int.mode})</div>
                                          
                                          {(int.hours_worked || int.policy_used) && (
                                            <div className="flex gap-4 mt-2 pt-2 border-t border-slate-100">
                                              {int.hours_worked && (
                                                <div className="text-[11px]">
                                                  <span className="text-slate-500">Hours:</span> <span className="font-bold text-slate-700">{int.hours_worked}h</span>
                                                </div>
                                              )}
                                              {int.policy_used && (
                                                <div className="text-[11px]">
                                                  <span className="text-slate-500">Policy:</span> <span className="font-bold text-slate-700">{int.policy_used}</span>
                                                </div>
                                              )}
                                              {int.credits_awarded && (
                                                <div className="text-[11px]">
                                                  <span className="text-slate-500">Credits:</span> <span className="font-bold text-teal-600">{int.credits_awarded}</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {int.rejection_reason && (
                                            <div className="mt-2 p-2 bg-red-50 text-red-700 text-[10px] rounded border border-red-100">
                                              <strong>Rejection Reason:</strong> {int.rejection_reason}
                                            </div>
                                          )}
                                        </div>
                                      ))}
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
            )}
          </div>
        </>
      ) : activeTab === 'completed' || activeTab === 'pending' ? (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              {activeTab === 'completed' ? 'Completed Internships' : 'Pending/Ongoing Internships'} 
              ({activeTab === 'completed' ? completedInternships.length : pendingInternships.length})
            </h2>
          </div>

          {(activeTab === 'completed' ? completedInternships : pendingInternships).length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">
                No {activeTab} internships found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Internship</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Company</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    {activeTab === 'completed' && (
                      <>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Hours</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Credits</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(activeTab === 'completed' ? completedInternships : pendingInternships).map((int) => (
                    <tr key={int.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{int.student_name}</div>
                        <div className="text-xs text-slate-500">{int.student_dept}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 font-medium">{int.title}</div>
                        <div className="text-xs text-slate-500">{int.location} ({int.mode})</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {int.company_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          int.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          int.status === 'accepted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {int.status}
                        </span>
                      </td>
                      {activeTab === 'completed' && (
                        <>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {int.hours_worked}h
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-teal-600">
                            {int.credits_awarded || '-'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : activeTab === 'status' ? (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Student Internship Progress</h2>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-slate-600">Ongoing/Accepted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-slate-600">Applied/Pending</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Current Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Progress</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((student) => {
                  const completed = student.internships.filter(i => i.status === 'completed').length;
                  const ongoing = student.internships.filter(i => i.status === 'accepted').length;
                  const pending = student.internships.filter(i => i.status === 'applied' || i.status === 'pending').length;
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{student.name}</div>
                        <div className="text-xs text-slate-500">APAAR: {student.apaar_id || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {student.department || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {completed > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold">
                              {completed} COMPLETED
                            </span>
                          )}
                          {ongoing > 0 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-bold">
                              {ongoing} ONGOING
                            </span>
                          )}
                          {pending > 0 && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] font-bold">
                              {pending} APPLIED
                            </span>
                          )}
                          {student.internships.length === 0 && (
                            <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded text-[10px] font-bold">
                              NO INTERNSHIPS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[100px]">
                          <div 
                            className="bg-emerald-500 h-1.5 rounded-full" 
                            style={{ width: `${student.internships.length > 0 ? (completed / student.internships.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {completed} of {student.internships.length} finished
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => {
                            setActiveTab('students');
                            setExpandedStudentId(student.id);
                            setSearchQuery(student.name);
                          }}
                          className="text-brand-600 hover:text-brand-700 text-xs font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeTab === 'credits' ? (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Credit Requests</h2>
          </div>

          {creditRequests.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No credit requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Internship
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Credits
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Policy
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {creditRequests
                    .filter(request => 
                      request.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (request.internship_title && request.internship_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      (request.company_name && request.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{request.student_name}</div>
                        <div className="text-[10px] text-slate-500">ID: #{request.student_id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="font-medium text-slate-900">{request.internship_title || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {request.company_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {request.hours}h
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-teal-600">
                        {request.credits_calculated}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {request.policy_type}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full
                            ${request.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : request.status === 'rejected'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : request.status === 'exception'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              disabled={actionLoading === request.id}
                              className="px-3 py-1 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === request.id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              disabled={actionLoading === request.id}
                              className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === request.id ? '...' : 'Reject'}
                            </button>
                            <button
                              onClick={() => handleMarkException(request.id)}
                              disabled={actionLoading === request.id}
                              className="px-3 py-1 text-xs font-medium text-amber-600 border border-amber-200 rounded hover:bg-amber-50 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === request.id ? '...' : 'Exception'}
                            </button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          request.is_pushed_to_abc ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Pushed to ABC
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePushToABC(request.id)}
                              disabled={actionLoading === request.id}
                              className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50 transition-colors flex items-center gap-1 ml-auto"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                              </svg>
                              {actionLoading === request.id ? 'Pushing...' : 'Push to ABC'}
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : activeTab === 'audit' ? (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Audit Logs</h2>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No audit logs found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditLogs
                    .filter(log =>
                      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      log.details.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium border border-slate-200">
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default InstituteDashboard;
