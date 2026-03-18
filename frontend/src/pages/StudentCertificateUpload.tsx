import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { PageLoader, ButtonSpinner } from '../components/LoadingSpinner';

interface InternshipInfo {
  id: number;
  title: string;
  company_name: string;
  status: string;
}

export function StudentCertificateUpload() {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('application_id');
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [internship, setInternship] = useState<InternshipInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    policy: 'UGC'
  });

  useEffect(() => {
    const fetchInternshipInfo = async () => {
      if (!applicationId) {
        setLoading(false);
        return;
      }

      try {
        const appsRes = await api.get<any[]>('/students/my-applications');
        const app = appsRes.find(a => a.id === parseInt(applicationId));
        
        if (!app) {
          toast.error('Application not found');
          navigate('/student/applications');
          return;
        }

        if (app.status !== 'completed') {
          toast.error('Internship must be completed to upload certificate');
          navigate('/student/applications');
          return;
        }

        setInternship({
          id: app.id,
          title: app.internship.title,
          company_name: app.internship.company_name,
          status: app.status
        });
      } catch (err) {
        toast.error('Failed to fetch internship info');
        navigate('/student/applications');
      } finally {
        setLoading(false);
      }
    };

    fetchInternshipInfo();
  }, [applicationId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setSubmitting(true);
    try {
      // 1. Upload Certificate (Automated credit request handled by backend)
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      if (applicationId) {
        uploadFormData.append('application_id', applicationId);
      }
      uploadFormData.append('policy_type', formData.policy);

      await api.post('/certificates/upload', uploadFormData);

      toast.success('Certificate uploaded successfully! Credit request is being processed.');
      navigate('/student/applications');
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to complete request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading internship details..." />;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => navigate('/student/applications')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 text-left">
            {applicationId ? 'Upload Certificate' : 'External Certificate Submission'}
          </h1>
          <p className="text-slate-500 mt-1">
            {applicationId 
              ? 'Submit your internship certificate for credit approval' 
              : 'Upload a certificate from an external internship for credit verification'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{internship?.title || 'External Internship'}</h2>
              <p className="text-sm text-slate-500">{internship?.company_name || 'Self-reported Organization'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 text-left">
          {/* File Upload Section */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
              Certificate Document
            </label>
            <div 
              className={`border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4
                ${file ? 'border-brand-300 bg-brand-50/30' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'}`}
            >
              <input
                type="file"
                id="cert-upload"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
              />
              {!file ? (
                <label htmlFor="cert-upload" className="cursor-pointer flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-slate-900 font-bold mb-1">Click to upload or drag & drop</p>
                  <p className="text-sm text-slate-500">PDF, JPG, or PNG (Max 5MB)</p>
                </label>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-4 text-brand-600">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-900 font-bold mb-1 truncate max-w-xs">{file.name}</p>
                  <p className="text-sm text-slate-500 mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button 
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-sm font-bold text-red-600 hover:text-red-700 underline underline-offset-4"
                  >
                    Remove File
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Credit Details Section */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
                Credit Policy
              </label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                value={formData.policy}
                onChange={(e) => setFormData({ ...formData, policy: e.target.value })}
              >
                <option value="UGC">UGC Guidelines</option>
                <option value="AICTE">AICTE Guidelines</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={!file || submitting}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2
                ${!file || submitting ? 'bg-slate-300 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20'}`}
            >
              {submitting ? (
                <>
                  <ButtonSpinner />
                  Processing Submission...
                </>
              ) : (
                'Submit Certificate & Request Credits'
              )}
            </button>
            <p className="text-xs text-slate-400 mt-4 text-center">
              Your certificate will be processed using AI for authenticity verification. 
              The final credit approval depends on your institute.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
