import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
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
  application_id?: number | null;
  internship_title?: string;
  company_name?: string;
  hours: number;
  credits_calculated: number;
  policy_type: string;
  status: string;
  created_at: string;
  is_pushed_to_abc?: boolean;
  certificate?: {
    id: number;
    file_url: string;
    internship_title: string;
    organization_name: string;
    duration_in_months: number;
    total_hours: number;
    performance_remark: string;
    authenticity_score: number;
    verification_status: string;
  };
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
  details?: string;
  timestamp: string;
}

interface InstituteProfile {
  id: number;
  institute_name: string;
  aishe_code: string;
  contact_number?: string;
  description?: string;
  city?: string;
  website_url?: string;
  logo_url?: string;
  is_verified: boolean;
  institute_type?: string;
  state?: string;
}

export function InstituteDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<InstituteProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'completed' | 'pending' | 'credits' | 'external' | 'audit' | 'status' | 'profile'>('students');

  // Sync active tab with URL path
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/institute/students')) {
      setActiveTab('students');
    } else if (path.includes('/institute/certificates')) {
      setActiveTab('external');
    } else if (path.includes('/institute/profile')) {
      setActiveTab('profile');
    }
  }, [window.location.pathname]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState<Partial<InstituteProfile>>({});

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [certImageUrls, setCertImageUrls] = useState<Record<number, string>>({});
   const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);
   const [selectedRequest, setSelectedRequest] = useState<CreditRequest | null>(null);
 
   const getStudentForRequest = (studentId: number) => {
     return students.find(s => s.id === studentId);
   };

   const fetchCertImage = async (certId: number) => {
    if (certImageUrls[certId]) return certImageUrls[certId];
    try {
      const response = await api.get(`/certificates/view/${certId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response as Blob);
      setCertImageUrls(prev => ({ ...prev, [certId]: url }));
      return url;
    } catch (err) {
      console.error('Failed to fetch certificate image:', err);
      return '';
    }
  };

  useEffect(() => {
    if (selectedRequest?.certificate?.id) {
      fetchCertImage(selectedRequest.certificate.id);
    }
  }, [selectedRequest]);

  // Fetch data
  const fetchData = async () => {
    try {
      setPageLoading(true);
      console.log('Fetching dashboard data from:', api.defaults.baseURL);
      
      const profileRes = await api.get<InstituteProfile>('/institutes/profile');
      console.log('Profile fetched:', profileRes);
      setProfile(profileRes);
      setProfileFormData(profileRes);
      
      console.log('Fetching students, credits, stats, and logs...');
      const [studentsRes, creditsRes, statsRes, logsRes] = await Promise.all([
        api.get<StudentInfo[]>('/institutes/students'),
        api.get<CreditRequest[]>('/institutes/credit-requests'),
        api.get<DashboardStats>('/institutes/dashboard/stats'),
        api.get<AuditLog[]>('/institutes/audit-logs')
      ]);
      
      console.log('All data fetched successfully');
      setStudents(studentsRes || []);
      setCreditRequests(creditsRes || []);
      setStats(statsRes);
      setAuditLogs(logsRes || []);
    } catch (err) {
      const error = err as ApiError;
      console.error('Detailed Dashboard Load Error:', {
        message: error.message,
        stack: error.stack,
        url: (error as any).url,
        status: (error as any).status
      });
      toast.error(error.message || 'Failed to load dashboard data');
      setStudents([]);
      setCreditRequests([]);
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
    if (request && request.application_id) {
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
    if (request && request.application_id) {
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

  const handleApproveCertificate = async (request: CreditRequest) => {
    if (!request.certificate) return;
    
    setActionLoading(request.id);
    try {
      // Hit the specific certificate approval endpoint that also pushes to ABC
      await api.post(`/institutes/certificates/${request.certificate.id}/approve-and-push`, {});
      toast.success('Certificate approved and credits pushed to ABC portal!');
      
      // Update local state instead of full fetchData to avoid jumping
      setCreditRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'approved', is_pushed_to_abc: true } : r
      ));
      
      // Optionally close modal or stay on it to show success state
      // setSelectedRequest(null); 
      
      fetchData(); // Still refresh in background
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to approve certificate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectCertificate = async (request: CreditRequest) => {
    if (!request.certificate) return;
    
    const reason = prompt("Enter reason for rejection:");
    if (!reason) return;

    setActionLoading(request.id);
    try {
      await api.post(`/institutes/certificates/${request.certificate.id}/reject`, { reason });
      toast.success('Certificate rejected');
      
      setCreditRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'rejected' } : r
      ));
      
      fetchData();
      setSelectedRequest(null);
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to reject certificate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(999); // Use dummy ID for profile loading
    try {
      const updatedProfile = await api.put<InstituteProfile>('/institutes/profile', profileFormData);
      setProfile(updatedProfile);
      setProfileFormData(updatedProfile);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter students based on search and dropdowns
  const filteredStudents = students.filter(student => {
    const matchesSearch = (student.name && student.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.department && student.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.apaar_id && student.apaar_id.includes(searchQuery));
    
    const matchesDept = selectedDepartment === 'all' || student.department === selectedDepartment;
    const matchesYear = selectedYear === 'all' || student.year?.toString() === selectedYear;
    
    return matchesSearch && matchesDept && matchesYear;
  });

  // Extract unique values for dropdowns
  const departments = Array.from(new Set(students.map(s => s.department).filter(Boolean))).sort() as string[];
  const years = Array.from(new Set(students.map(s => s.year).filter(Boolean))).sort((a, b) => (a || 0) - (b || 0)) as number[];

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
      (int.student_name && int.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (int.title && int.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (int.company_name && int.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
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

  if (!profile && !pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Institute Data Not Found</h2>
          <p className="text-slate-500 mb-6">We couldn't retrieve your institute profile. Please try refreshing or contact support.</p>
          <button 
            onClick={() => fetchData()}
            className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col items-center">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-100/50 via-slate-50 to-transparent -z-10" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-indigo-100/20 rounded-full blur-3xl -z-10" />

      <div className="w-full px-2 sm:px-4 lg:px-6 py-4 sm:py-6 relative z-10 space-y-6 flex-grow">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-6 gap-4">
        <div className="flex items-center gap-3">
          {/* Back Arrow - Only visible on Mobile */}
          <button 
            onClick={() => navigate(-1)}
            className="sm:hidden p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 bg-white/50 backdrop-blur-sm"
            aria-label="Go back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Institute Dashboard V2.0</h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-lg">Monitoring student internship progress.</p>
          </div>
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

      {/* Selected Request Details Modal (Simple Review) */}
      {selectedRequest && !selectedRequest.certificate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-slideUp">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Credit Request</h2>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student</p>
                <p className="font-bold text-slate-900">{selectedRequest.student_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hours</p>
                  <p className="font-bold text-slate-900">{selectedRequest.hours}h</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Credits</p>
                  <p className="font-bold text-brand-600">{selectedRequest.credits_calculated}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <p className="font-bold text-slate-700 capitalize">{selectedRequest.status}</p>
              </div>
            </div>
            {selectedRequest.status === 'pending' && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(selectedRequest.id)}
                  className="flex-1 py-3 bg-white text-rose-600 border border-rose-100 rounded-xl font-bold hover:bg-rose-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Chips Row */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
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

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, department, or APAAR ID..."
              className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-400 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:bg-white transition-all outline-none font-medium"
            />
          </div>
          
          <div className="flex gap-3 sm:flex-row flex-col">
            <div className="relative min-w-[220px]">
              <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider z-10">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm appearance-none font-medium cursor-pointer outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative min-w-[160px]">
              <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider z-10">Academic Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm appearance-none font-medium cursor-pointer outline-none"
              >
                <option value="all">All Years</option>
                {years.map(year => (
                  <option key={year} value={year.toString()}>Year {year}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {(searchQuery || selectedDepartment !== 'all' || selectedYear !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDepartment('all');
                  setSelectedYear('all');
                }}
                className="px-4 py-3.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap border border-rose-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 pb-2 border-b border-slate-100 custom-scrollbar">
        {[
          { id: 'students', label: 'Students', count: filteredStudents.length, path: '/institute/students' },
          { id: 'completed', label: 'Completed', count: completedInternships.length, color: 'emerald' },
          { id: 'pending', label: 'Pending', count: pendingInternships.length, color: 'amber' },
          { id: 'external', label: 'Certificates', count: creditRequests.filter(r => r.certificate && r.status === 'pending').length, color: 'brand', path: '/institute/certificates' },
          { id: 'audit', label: 'Audit Logs' },
          { id: 'status', label: 'Status', count: students.reduce((acc, s) => acc + (s.total_internships > 0 ? 1 : 0), 0) },
          { id: 'profile', label: 'Profile', path: '/institute/profile' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.path) {
                navigate(tab.path);
              }
            }}
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
                    : tab.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                      tab.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                      tab.color === 'brand' ? 'bg-brand-100 text-brand-700' :
                      'bg-slate-100 text-slate-700'}
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
      ) : activeTab === 'external' ? (
        <section className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden animate-fadeIn">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Student Certificate Submissions</h2>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Verify and award credits for external internships</p>
            </div>
            <div className="px-6 py-3 bg-brand-50 rounded-2xl border border-brand-100">
              <span className="text-xs font-black text-brand-600 uppercase tracking-widest">
                {creditRequests.filter(r => r.certificate).length} Total Submissions
              </span>
            </div>
          </div>

          {creditRequests.filter(r => r.certificate).length === 0 ? (
            <div className="p-24 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">No certificate submissions found.</h3>
              <p className="text-slate-500 font-medium">New certificates will appear here once uploaded by students.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Details</th>
                    <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Internship & Organization</th>
                    <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Extraction</th>
                    <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Credits</th>
                    <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="text-right px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {creditRequests
                    .filter(request => request.certificate)
                    .map((request) => (
                    <tr 
                      key={request.id} 
                      className="group hover:bg-slate-50/80 transition-all cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-sm font-black text-brand-600 group-hover:scale-110 transition-transform">
                            {request.student_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900">{request.student_name}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: #{request.student_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-slate-800 tracking-tight">{request.certificate?.internship_title}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{request.certificate?.organization_name}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  (request.certificate?.authenticity_score || 0) > 0.8 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                                  (request.certificate?.authenticity_score || 0) > 0.5 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                                }`}
                                style={{ width: `${(request.certificate?.authenticity_score || 0) * 100}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-black ${
                              (request.certificate?.authenticity_score || 0) > 0.8 ? 'text-emerald-600' : 
                              (request.certificate?.authenticity_score || 0) > 0.5 ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {((request.certificate?.authenticity_score || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit border ${
                            request.certificate?.verification_status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            request.certificate?.verification_status === 'FLAGGED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {request.certificate?.verification_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-brand-600 tracking-tighter">{request.credits_calculated} Credits</div>
                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{request.policy_type} Policy</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm
                          ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            request.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="p-3 bg-white text-slate-400 hover:text-brand-600 hover:bg-brand-50 border border-slate-100 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95"
                          title="Review Certificate"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                      (request.student_name && request.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
      ) : activeTab === 'profile' && profile ? (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Institute Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage your institution's details and verification</p>
            </div>
            {!isEditingProfile && (
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            )}
          </div>

          <div className="p-8">
            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Institute Name</label>
                    <input 
                      type="text" 
                      value={profileFormData.institute_name || ''}
                      onChange={(e) => setProfileFormData({...profileFormData, institute_name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">AISHE Code (Read-only)</label>
                    <input 
                      type="text" 
                      value={profile.aishe_code}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 cursor-not-allowed outline-none"
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Contact Number</label>
                    <input 
                      type="text" 
                      value={profileFormData.contact_number || ''}
                      onChange={(e) => setProfileFormData({...profileFormData, contact_number: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">City</label>
                    <input 
                      type="text" 
                      value={profileFormData.city || ''}
                      onChange={(e) => setProfileFormData({...profileFormData, city: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Website URL</label>
                    <input 
                      type="url" 
                      value={profileFormData.website_url || ''}
                      onChange={(e) => setProfileFormData({...profileFormData, website_url: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Institute Type</label>
                    <select 
                      value={profileFormData.institute_type || ''}
                      onChange={(e) => setProfileFormData({...profileFormData, institute_type: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Select Type</option>
                      <option value="Government">Government</option>
                      <option value="Private">Private</option>
                      <option value="Autonomous">Autonomous</option>
                      <option value="Deemed University">Deemed University</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">About the Institution</label>
                  <textarea 
                    value={profileFormData.description || ''}
                    onChange={(e) => setProfileFormData({...profileFormData, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Briefly describe your institution..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    disabled={actionLoading === 999}
                    className="flex-1 py-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {actionLoading === 999 ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileFormData(profile);
                    }}
                    className="px-8 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="animate-fadeIn">
                {/* Profile View - Matching Employer Style */}
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-8">
                  <div className="h-40 bg-gradient-to-r from-brand-500 to-indigo-600"></div>
                  <div className="px-8 pb-8">
                    <div className="relative flex justify-between items-end -mt-16 mb-6">
                      <div className="w-40 h-40 rounded-3xl bg-white p-2 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                        {profile.logo_url ? (
                          <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-6xl text-brand-200">
                            <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 mb-4">
                        <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${
                          profile.is_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {profile.is_verified ? '✓ Verified Institution' : '⚠ Verification Pending'}
                        </div>
                      </div>
                    </div>

                    <div className="max-w-4xl">
                      <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{profile.institute_name}</h1>
                      <div className="flex flex-wrap items-center gap-4 text-slate-500 font-bold text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                          AISHE: {profile.aishe_code}
                        </div>
                        {profile.city && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            {profile.city}, {profile.state || 'India'}
                          </div>
                        )}
                        {profile.institute_type && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            {profile.institute_type}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
                    <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">About the Institution</h3>
                      <p className="text-slate-600 leading-relaxed font-medium text-lg">
                        {profile.description || 'No description provided. Add an about section to showcase your institution to students and employers.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Contact Information</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 group">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Official Email</p>
                            <p className="text-sm font-bold text-slate-700">{user?.email || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Phone Number</p>
                            <p className="text-sm font-bold text-slate-700">{profile.contact_number || 'N/A'}</p>
                          </div>
                        </div>
                        {profile.website_url && (
                          <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Website</p>
                              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-brand-600 hover:underline">
                                Visit Portal ↗
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-brand-600 p-6 rounded-[28px] shadow-lg shadow-brand-500/20 text-white relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                      <h3 className="text-[10px] font-black text-brand-200 uppercase tracking-widest mb-2">Institution Stats</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-2xl font-black">{students.length}</p>
                          <p className="text-[9px] font-bold text-brand-100 uppercase">Registered Students</p>
                        </div>
                        <div>
                          <p className="text-2xl font-black">{stats?.total_credits_approved || 0}</p>
                          <p className="text-[9px] font-bold text-brand-100 uppercase">Credits Approved</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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
                      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
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

      {/* Certificate Detailed Review Modal */}
      {selectedRequest && selectedRequest.certificate && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col md:flex-row border border-white/20">
            {/* Left: Certificate Image Preview - Split Screen */}
            <div className="md:w-1/2 bg-slate-100 flex flex-col h-full border-r border-slate-200">
              <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Original Certificate</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Document Preview</p>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={certImageUrls[selectedRequest.certificate.id] || `${api.defaults.baseURL}/certificates/view/${selectedRequest.certificate.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-slate-100 hover:bg-brand-50 text-slate-500 hover:text-brand-600 rounded-xl transition-all"
                    title="Open in new tab"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto p-8 flex items-center justify-center bg-slate-200/50 custom-scrollbar">
                {certImageUrls[selectedRequest.certificate.id] ? (
                  <img 
                    src={certImageUrls[selectedRequest.certificate.id]} 
                    alt="Certificate" 
                    className="max-w-full h-auto rounded-xl shadow-2xl border-8 border-white transition-transform hover:scale-[1.01]"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-slate-400">
                    <div className="w-12 h-12 border-4 border-slate-300 border-t-brand-500 rounded-full animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest">Loading Document...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Extracted Details & Verification Controls */}
            <div className="md:w-1/2 p-10 flex flex-col h-full overflow-y-auto custom-scrollbar bg-white">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Review & Verify</h2>
                  <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Student Submission Analysis</p>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-3 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-2xl transition-all active:scale-90"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-8 flex-grow">
                {/* 1. Student Identity Section */}
                <section>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-brand-200">
                      {selectedRequest.student_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 leading-none">{selectedRequest.student_name}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">ID: #{selectedRequest.student_id}</span>
                        {getStudentForRequest(selectedRequest.student_id)?.apaar_id && (
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-tighter">
                            APAAR: {getStudentForRequest(selectedRequest.student_id)?.apaar_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Department</p>
                      <p className="text-xs font-bold text-slate-700">{getStudentForRequest(selectedRequest.student_id)?.department || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{getStudentForRequest(selectedRequest.student_id)?.email || 'N/A'}</p>
                    </div>
                  </div>
                </section>

                {/* 2. Extracted Data Comparison */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Extracted Data</h4>
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                      <span className="text-[10px] font-black text-indigo-600">AI CONFIDENCE</span>
                      <span className="text-xs font-black text-indigo-700">{Math.round((selectedRequest.certificate?.authenticity_score || 0) * 100)}%</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 relative group">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Organization / Company</p>
                      <p className="text-base font-bold text-slate-800 leading-tight">{selectedRequest.certificate?.organization_name}</p>
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] bg-white text-emerald-600 px-2 py-1 rounded-md border border-emerald-100 font-black">FETCHED ✓</span>
                      </div>
                    </div>

                    <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 relative group">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Internship Role / Title</p>
                      <p className="text-base font-bold text-slate-800 leading-tight">{selectedRequest.certificate?.internship_title}</p>
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] bg-white text-emerald-600 px-2 py-1 rounded-md border border-emerald-100 font-black">FETCHED ✓</span>
                      </div>
                    </div>
                  </div>

                  {/* Duration & Automatic Credit Calculation */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-amber-50/50 rounded-[24px] border border-amber-100">
                      <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2">Duration Extracted</p>
                      <div className="flex items-end gap-1.5">
                        <span className="text-2xl font-black text-amber-700 leading-none">{selectedRequest.certificate?.duration_in_months || 0}</span>
                        <span className="text-xs font-bold text-amber-600 mb-0.5">Months</span>
                      </div>
                      <p className="text-[10px] text-amber-500 font-bold mt-2 uppercase tracking-tighter">({selectedRequest.certificate?.total_hours || 0} total hours)</p>
                    </div>
                    <div className="p-5 bg-emerald-50 rounded-[24px] border border-emerald-100 shadow-sm shadow-emerald-100/50">
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Automatic Credits</p>
                      <div className="flex items-end gap-1.5">
                        <span className="text-2xl font-black text-emerald-700 leading-none">{selectedRequest.credits_calculated}</span>
                        <span className="text-xs font-bold text-emerald-600 mb-0.5">Points</span>
                      </div>
                      <p className="text-[10px] text-emerald-500 font-bold mt-2 uppercase tracking-tighter">
                        Calculated: 1pt / {selectedRequest.policy_type === 'UGC' ? '30hrs' : '40hrs'} ({selectedRequest.policy_type} Policy)
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* 3. Verification Action Workflow */}
              <div className="mt-10 pt-8 border-t border-slate-100">
                {selectedRequest.status === 'pending' ? (
                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleApproveCertificate(selectedRequest)}
                        disabled={actionLoading === selectedRequest.id}
                        className="flex-[2] bg-emerald-600 text-white py-5 rounded-[24px] font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 active:scale-95 disabled:opacity-50"
                      >
                        {actionLoading === selectedRequest.id ? (
                          <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Accept & Push to ABC
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectCertificate(selectedRequest)}
                        disabled={actionLoading === selectedRequest.id}
                        className="flex-1 bg-rose-50 text-rose-600 py-5 rounded-[24px] font-black hover:bg-rose-100 transition-all border border-rose-100 active:scale-95 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-center">
                        Pushing to ABC will update Student's official credit ledger
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`p-6 rounded-[28px] text-center border-2 flex flex-col items-center gap-2 ${
                    selectedRequest.status === 'approved' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm mb-1">
                      {selectedRequest.status === 'approved' ? (
                        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-base font-black uppercase tracking-widest">
                      SUBMISSION {selectedRequest.status.toUpperCase()}
                    </span>
                    {selectedRequest.is_pushed_to_abc && (
                      <p className="text-[10px] font-black opacity-75 uppercase tracking-tighter">✓ Successfully Synced with ABC Portal</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstituteDashboard;
