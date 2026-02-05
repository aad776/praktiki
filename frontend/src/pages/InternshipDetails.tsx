import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { PageLoader, ButtonSpinner } from '../components/LoadingSpinner';
import { 
  FiMapPin, FiClock, FiCalendar, FiDollarSign, 
  FiUsers, FiBriefcase, FiAward, FiInfo,
  FiChevronLeft, FiBookmark, FiSend, FiGlobe
} from 'react-icons/fi';

interface InternshipDetail {
  id: number;
  title: string;
  description: string;
  location: string;
  mode: string;
  duration_weeks: number;
  stipend_amount: number | null;
  deadline: string | null;
  start_date: string | null;
  skills: string | null;
  openings: number;
  qualifications: string | null;
  benefits: string | null;
  applicant_count: number;
  employer?: {
    id: number;
    company_name: string;
    contact_number?: string;
    industry?: string;
    organization_description?: string;
    website_url?: string;
    logo_url?: string;
    city?: string;
  };
}

interface Application {
  id: number;
  internship_id: number;
  status: string;
}

export function InternshipDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [internship, setInternship] = useState<InternshipDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        // Fetch internship details
        const response = await api.get<InternshipDetail>(`/students/internships/${id}`);
        setInternship(response);

        // Fetch user's applications to check if already applied
        const appsRes = await api.get<Application[]>('/students/my-applications');
        setApplications(appsRes);
      } catch (err) {
        const error = err as ApiError;
        toast.error(error.message || 'Failed to load internship details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  const hasApplied = applications.some(app => app.internship_id === parseInt(id || '0'));
  const applicationStatus = applications.find(app => app.internship_id === parseInt(id || '0'))?.status;

  const handleApply = async () => {
    if (!id) return;
    
    setApplying(true);
    try {
      await api.post('/students/apply', { internship_id: parseInt(id) });
      
      // Record feedback
      await api.post('/students/feedback', { internship_id: parseInt(id), action: 'apply' }).catch(() => {});
      
      toast.success('Application submitted successfully!');
      
      // Refresh applications
      const appsRes = await api.get<Application[]>('/students/my-applications');
      setApplications(appsRes);
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Internship removed from saved' : 'Internship saved successfully!');
  };

  if (loading) {
    return <PageLoader label="Loading internship details..." />;
  }

  if (!internship) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Internship Not Found</h2>
        <p className="text-slate-600 mb-4">The internship you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/student')}
          className="text-blue-600 hover:underline font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors group"
      >
        <FiChevronLeft className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Search</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-5">
                {internship.employer?.logo_url ? (
                  <img 
                    src={internship.employer.logo_url} 
                    alt={internship.employer.company_name} 
                    className="w-16 h-16 rounded-xl object-cover border border-slate-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-2xl font-bold">
                    {internship.employer?.company_name?.[0]}
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-1">{internship.title}</h1>
                  <p className="text-lg text-slate-600 font-medium">{internship.employer?.company_name}</p>
                </div>
              </div>
              {hasApplied && (
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize border
                  ${applicationStatus === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    applicationStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {applicationStatus}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <FiCalendar className="shrink-0" />
                  <span>START DATE</span>
                </div>
                <p className="font-semibold text-slate-900">{internship.start_date || 'Immediately'}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <FiClock className="shrink-0" />
                  <span>DURATION</span>
                </div>
                <p className="font-semibold text-slate-900">{internship.duration_weeks} Weeks</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <FiDollarSign className="shrink-0" />
                  <span>STIPEND</span>
                </div>
                <p className="font-semibold text-slate-900">
                  {internship.stipend_amount ? `₹${internship.stipend_amount}/mo` : 'Unpaid'}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <FiUsers className="shrink-0" />
                  <span>APPLICANTS</span>
                </div>
                <p className="font-semibold text-slate-900">{internship.applicant_count} Applied</p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <FiBriefcase className="text-blue-600" />
                  About the Role
                </h2>
                <div className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-white">
                  {internship.description}
                </div>
              </section>

              {internship.skills && (
                <section>
                  <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <FiAward className="text-blue-600" />
                    Skills Required
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {internship.skills.split(',').map((skill, i) => (
                      <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {internship.qualifications && (
                <section>
                  <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <FiInfo className="text-blue-600" />
                    Who Can Apply
                  </h2>
                  <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {internship.qualifications}
                  </div>
                </section>
              )}

              {internship.benefits && (
                <section>
                  <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <FiAward className="text-emerald-600" />
                    Perks & Benefits
                  </h2>
                  <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {internship.benefits}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm sticky top-8">
            <div className="mb-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3 text-slate-600 mb-4">
                <FiMapPin className="text-blue-600" />
                <span className="font-medium">{internship.location} ({internship.mode})</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 mb-4">
                <FiCalendar className="text-blue-600" />
                <span className="font-medium">Apply by {internship.deadline || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <FiBriefcase className="text-blue-600" />
                <span className="font-medium">{internship.openings} Openings</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleApply}
                disabled={hasApplied || applying}
                className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
                  ${hasApplied 
                    ? 'bg-emerald-50 text-emerald-600 cursor-not-allowed border border-emerald-100' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 active:scale-[0.98]'
                  } disabled:opacity-70`}
              >
                {applying ? <ButtonSpinner /> : hasApplied ? '✓ Applied' : <><FiSend /> Apply Now</>}
              </button>
              
              <button
                onClick={handleSave}
                className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border-2
                  ${isSaved 
                    ? 'bg-amber-50 border-amber-200 text-amber-600' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <FiBookmark fill={isSaved ? 'currentColor' : 'none'} />
                {isSaved ? 'Saved' : 'Save for Later'}
              </button>
            </div>
          </div>

          {/* Company Sidebar Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">About the Company</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-xl font-bold text-slate-400">
                  {internship.employer?.company_name?.[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{internship.employer?.company_name}</h3>
                  <p className="text-sm text-slate-500">{internship.employer?.industry || 'Industry N/A'}</p>
                </div>
              </div>
              
              {internship.employer?.organization_description && (
                <p className="text-sm text-slate-600 line-clamp-4 leading-relaxed">
                  {internship.employer.organization_description}
                </p>
              )}

              {internship.employer?.website_url && (
                <a 
                  href={internship.employer.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline"
                >
                  <FiGlobe /> Visit Website
                </a>
              )}

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                  Company Activity
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Actively hiring on this platform</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InternshipDetails;
