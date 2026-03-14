import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { PageLoader, ButtonSpinner } from '../components/LoadingSpinner';
import { 
  FiMapPin, FiClock, FiCalendar, FiDollarSign, 
  FiUsers, FiBriefcase, FiAward, FiInfo,
  FiChevronLeft, FiBookmark, FiSend, FiGlobe,
  FiShare2, FiHeart, FiCheckCircle, FiFileText, FiGift
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
  created_at: string;
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
  const [imgError, setImgError] = useState(false);

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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors group"
      >
        <FiChevronLeft className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Search</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
             {/* Header Section */}
             <div className="flex justify-between items-start mb-8">
                <div className="flex gap-4">
                   <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                      {internship.employer?.logo_url && !imgError ? (
                         <img 
                           src={internship.employer.logo_url} 
                           alt={internship.employer.company_name} 
                           className="w-full h-full object-contain rounded-xl"
                           onError={() => setImgError(true)}
                         />
                      ) : (
                         <span className="text-2xl font-bold text-slate-300">
                            {internship.employer?.company_name?.[0]}
                         </span>
                      )}
                   </div>
                   <div>
                      <h1 className="text-2xl font-bold text-slate-900 mb-1">{internship.title}</h1>
                      <p className="text-slate-500 font-medium">{internship.employer?.company_name}</p>
                   </div>
                </div>
                {hasApplied && (
                   <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-full border border-blue-100">
                      Applied
                   </span>
                )}
             </div>

             {/* Info Grid */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
                <div>
                   <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <FiCalendar className="mr-1.5" /> Start Date
                   </div>
                   <div className="font-semibold text-slate-900">
                      {internship.start_date ? new Date(internship.start_date).toLocaleDateString() : 'Immediately'}
                   </div>
                </div>
                <div>
                   <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <FiClock className="mr-1.5" /> Duration
                   </div>
                   <div className="font-semibold text-slate-900">{internship.duration_weeks} Weeks</div>
                </div>
                <div>
                   <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <FiDollarSign className="mr-1.5" /> Stipend
                   </div>
                   <div className="font-semibold text-slate-900">
                      {internship.stipend_amount ? `₹${internship.stipend_amount}/mo` : 'Unpaid'}
                   </div>
                </div>
                <div>
                   <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <FiUsers className="mr-1.5" /> Applicants
                   </div>
                   <div className="font-semibold text-slate-900">
                      {internship.applicant_count} Applied
                   </div>
                </div>
             </div>

             {/* About Role */}
             <div className="mb-8">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
                   <FiBriefcase className="text-blue-600" /> About the Role
                </h2>
                <div className="text-slate-600 leading-relaxed whitespace-pre-line">
                   {internship.description}
                </div>
             </div>

             {/* Skills */}
             <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
                   <FiAward className="text-blue-600" /> Skills Required
                </h2>
                <div className="flex flex-wrap gap-2">
                   {internship.skills?.split(',').map((skill, i) => (
                      <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
                         {skill.trim()}
                      </span>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-blue-50 rounded-lg text-blue-600">
                   <FiMapPin className="w-4 h-4" />
                </div>
                <div>
                   <p className="text-sm text-slate-500 mb-1">Location</p>
                   <p className="text-slate-900 font-medium">{internship.location} ({internship.mode})</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-blue-50 rounded-lg text-blue-600">
                   <FiCalendar className="w-4 h-4" />
                </div>
                <div>
                   <p className="text-sm text-slate-500 mb-1">Apply by</p>
                   <p className="text-slate-900 font-medium">{internship.deadline || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-blue-50 rounded-lg text-blue-600">
                   <FiBriefcase className="w-4 h-4" />
                </div>
                <div>
                   <p className="text-sm text-slate-500 mb-1">Openings</p>
                   <p className="text-slate-900 font-medium">{internship.openings} Openings</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-100">
              {hasApplied ? (
                 <button disabled className="w-full py-3 rounded-xl font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center gap-2 cursor-default">
                    <FiCheckCircle /> Applied
                 </button>
              ) : (
                 <button
                    onClick={handleApply}
                    disabled={applying}
                    className="w-full py-3 rounded-xl font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 transition-all flex items-center justify-center gap-2"
                 >
                    {applying ? <ButtonSpinner /> : <><FiCheckCircle /> Apply Now</>}
                 </button>
              )}
              
              <button
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border
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
            <h2 className="text-lg font-bold text-slate-900 mb-6">About the Company</h2>
            
            <div className="flex items-center gap-4 mb-6">
               <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 font-bold border border-slate-100">
                  {internship.employer?.company_name?.[0]}
               </div>
               <div>
                  <h3 className="font-bold text-slate-900">{internship.employer?.company_name}</h3>
                  <p className="text-sm text-slate-500">{internship.employer?.industry || 'Industry N/A'}</p>
               </div>
            </div>

            <div className="space-y-4">
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Company Activity</p>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                     <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                     Actively hiring on this platform
                  </div>
               </div>
               
               {internship.employer?.website_url && (
                  <a 
                    href={internship.employer.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline pt-2"
                  >
                    <FiGlobe className="w-4 h-4" />
                    Visit Website
                  </a>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
