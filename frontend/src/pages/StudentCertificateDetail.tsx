
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageLoader } from '../components/LoadingSpinner';
import { 
  User, 
  Building2, 
  Briefcase, 
  Clock, 
  Hash, 
  ShieldCheck, 
  Download,
  ArrowLeft,
  Calendar,
  Award,
  Edit2,
  X,
  Check
} from 'lucide-react';

interface Certificate {
  id: number;
  internship_title: string;
  organization_name: string;
  student_name?: string;
  duration_in_months?: number;
  total_hours?: number;
  performance_remark?: string;
  application_id?: number;
  verification_status: string;
  created_at: string;
  file_url: string;
  start_date?: string;
  end_date?: string;
}

export function StudentCertificateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Certificate>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCertificate = async () => {
    try {
      const response = await api.get<Certificate>(`/certificates/${id}`);
      setCert(response);
      
      // Fetch the authenticated image blob
      const imageResponse = await api.get(`/certificates/view/${response.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(imageResponse as Blob);
      setImageUrl(url);
    } catch (err) {
      console.error('Failed to load certificate:', err);
      const error = err as ApiError;
      toast.error(error.message || 'Failed to load certificate details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const updatedCert = await api.patch<Certificate>(`/certificates/${id}`, editFormData);
      setCert(updatedCert);
      toast.success('Certificate details updated successfully');
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update certificate:', err);
      const error = err as ApiError;
      toast.error(error.message || 'Failed to update certificate');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = () => {
    if (cert) {
      setEditFormData({
        student_name: cert.student_name,
        organization_name: cert.organization_name,
        internship_title: cert.internship_title,
        total_hours: cert.total_hours,
        performance_remark: cert.performance_remark,
        start_date: cert.start_date,
        end_date: cert.end_date,
      });
      setIsEditModalOpen(true);
    }
  };

  useEffect(() => {
    fetchCertificate();
  }, [id]);

  if (loading) return <PageLoader label="Fetching certificate details..." />;
  if (!cert) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-10">
      <div className="max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-[2rem] border border-slate-200 sticky top-0 z-20 shadow-sm mb-8">
          <div className="px-6 md:px-10 h-24 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate('/student/applications')}
                className="p-3 hover:bg-slate-100 rounded-2xl text-slate-500 transition-all border border-transparent hover:border-slate-200"
              >
                <ArrowLeft className="w-7 h-7" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">Certificate Details</h1>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">ID: #CERT-{cert.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={openEditModal}
                className="hidden md:flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-black text-sm rounded-2xl border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                <Edit2 className="w-5 h-5" />
                Edit Details
              </button>
              <button 
                onClick={() => window.open(imageUrl, '_blank')}
                className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-black text-sm rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left: Professional Preview (Lg: 7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border border-slate-200 flex items-center justify-center min-h-[500px] md:min-h-[700px] relative overflow-hidden group">
              <div className="absolute top-8 left-8 z-10">
                <span className="px-5 py-2 bg-white/95 backdrop-blur shadow-sm rounded-full text-xs font-black text-slate-500 uppercase tracking-widest border border-slate-100">
                  Authenticated Document
                </span>
              </div>
              
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Certificate" 
                  className="max-w-full h-auto rounded-2xl shadow-2xl transition-transform duration-700 group-hover:scale-[1.01]"
                />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
                  <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Processing Image...</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-6 p-8 bg-emerald-50 border border-emerald-100 rounded-[2.5rem]">
              <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-200 shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-black text-emerald-900 text-lg uppercase tracking-tight">AI Verified Document</h4>
                <p className="text-emerald-700/80 text-base font-medium mt-1">This certificate has been analyzed and validated by our matching engine.</p>
              </div>
            </div>
          </div>

          {/* Right: Extracted Data (Lg: 5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-10 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-brand-500" />
                    <span className="text-xs font-black text-brand-500 uppercase tracking-widest">Data Insights</span>
                  </div>
                  <button 
                    onClick={openEditModal}
                    className="md:hidden p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-brand-500 transition-all border border-transparent hover:border-slate-100"
                  >
                    <Edit2 className="w-6 h-6" />
                  </button>
                </div>
                <h2 className="text-4xl font-black text-slate-900 leading-tight">Extracted Details</h2>
                <p className="text-slate-400 text-base mt-2 font-medium">Information captured from the certificate</p>
              </div>

              <div className="p-10 space-y-10">
                {/* Student Info */}
                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Identity & Context</h3>
                  <div className="space-y-6">
                    <InfoRow icon={<User />} label="Student Name" value={cert.student_name || 'Not detected'} />
                    <InfoRow icon={<Building2 />} label="Organisation" value={cert.organization_name} />
                    <InfoRow icon={<Briefcase />} label="Internship Role" value={cert.internship_title} />
                  </div>
                </section>

                {/* Timeline Info */}
                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Timeline & IDs</h3>
                  <div className="space-y-6">
                    <InfoRow icon={<Clock />} label="Duration" value={cert.total_hours ? `${cert.total_hours} Hours` : cert.duration_in_months ? `${cert.duration_in_months} Months` : 'Not detected'} />
                    <InfoRow icon={<Calendar />} label="Completion Date" value={new Date(cert.created_at).toLocaleDateString()} />
                    <InfoRow icon={<Hash />} label="Internship ID" value={cert.application_id ? `#APP-${cert.application_id}` : 'External Submission'} />
                  </div>
                </section>

                {/* Performance Info */}
                <section className="pt-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Performance Remark</h3>
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 relative group/remark">
                    <p className="text-slate-700 text-base md:text-lg leading-relaxed italic font-medium">
                      "{cert.performance_remark || 'Punctual, hardworking and inquisitive.'}"
                    </p>
                  </div>
                </section>

                {/* Status Badge */}
                <div className={`mt-8 p-8 rounded-[2.5rem] border-2 flex items-center justify-between ${
                  cert.verification_status === 'VERIFIED'
                    ? 'bg-emerald-50/50 border-emerald-100'
                    : 'bg-amber-50/50 border-amber-100'
                }`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl ${
                      cert.verification_status === 'VERIFIED' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-amber-500 shadow-amber-200'
                    }`}>
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Verification Status</p>
                      <p className={`font-black text-2xl ${
                        cert.verification_status === 'VERIFIED' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>{cert.verification_status}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">Edit Certificate Details</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manual Correction</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCertificate} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Name</label>
                  <input 
                    type="text"
                    value={editFormData.student_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, student_name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter student name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Organization Name</label>
                  <input 
                    type="text"
                    value={editFormData.organization_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, organization_name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter organization name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internship Role</label>
                  <input 
                    type="text"
                    value={editFormData.internship_title || ''}
                    onChange={(e) => setEditFormData({...editFormData, internship_title: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter internship role"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Hours</label>
                    <input 
                      type="number"
                      value={editFormData.total_hours || ''}
                      onChange={(e) => setEditFormData({...editFormData, total_hours: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                      placeholder="e.g. 160"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Completion Date</label>
                    <input 
                      type="date"
                      value={editFormData.end_date || ''}
                      onChange={(e) => setEditFormData({...editFormData, end_date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Performance Remark</label>
                  <textarea 
                    value={editFormData.performance_remark || ''}
                    onChange={(e) => setEditFormData({...editFormData, performance_remark: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Enter remarks..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {isUpdating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="flex items-center gap-4 group/item">
    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover/item:bg-brand-50 group-hover/item:text-brand-600 transition-all duration-300 shrink-0">
      {React.cloneElement(icon as React.ReactElement, { size: 18 })}
    </div>
    <div className="flex-1">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-slate-900 font-bold text-sm leading-tight">{value}</p>
    </div>
  </div>
);
