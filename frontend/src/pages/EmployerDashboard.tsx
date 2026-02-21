import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationPicker({ position, setPosition, setLocation }: any) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      // Reverse geocode
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`)
        .then(res => res.json())
        .then(data => {
          if (data.display_name) {
            setLocation(data.display_name);
          }
        });
    },
  });

  return position ? (
    <Marker position={position}>
      <Popup>Selected Location</Popup>
    </Marker>
  ) : null;
}

interface Internship {
  id: number;
  title: string;
  location: string;
  mode: string;
  duration_weeks: number;
  description?: string;
  stipend_amount?: number;
  skills?: string;
  deadline?: string;
  start_date?: string;
}

interface Application {
  id: number;
  internship_id: number;
  status: string;
  applied_at: string;
  student: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    university_name: string | null;
    skills: string | null;
    resume_file_path?: string | null;
    resume_json?: string | null;
  };
  resume_file_path?: string | null;
  resume_json?: string | null;
}

interface RecommendedStudent {
  student_id: number;
  student_name: string;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  explanation: {
    matched_skills: string[];
    missing_skills: string[];
    rule_based_score: number;
    embedding_score: number;
    weights: {
      rule: number;
      embedding: number;
    };
  };
  cross_encoder_score?: number;
}

export function EmployerDashboard() {
  const { token, logout, user } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applicationsByInternship, setApplicationsByInternship] = useState<
    Record<number, Application[]>
  >({});
  const [recommendationsByInternship, setRecommendationsByInternship] = useState<
    Record<number, RecommendedStudent[]>
  >({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState("remote");
  const [duration, setDuration] = useState(8);
  const [skills, setSkills] = useState("");
  const [stipendAmount, setStipendAmount] = useState<number | "">("");
  const [deadline, setDeadline] = useState("");
  const [openings, setOpenings] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [benefits, setBenefits] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [policy, setPolicy] = useState("UGC");
  const [mapPosition, setMapPosition] = useState<[number, number]>([28.7041, 77.1025]); // Default to Delhi, India
  const [isLocating, setIsLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setMapPosition([latitude, longitude]);
          // Reverse geocode with English language
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`)
            .then(res => res.json())
            .then(data => {
              if (data.display_name) {
                setLocation(data.display_name);
              }
            })
            .finally(() => setIsLocating(false));
        },
        (err) => {
          console.error("Geolocation error:", err);
          setIsLocating(false);
          setError("Could not get your current location. Please enter it manually.");
        }
      );
    } else {
      setIsLocating(false);
      setError("Geolocation is not supported by your browser.");
    }
  };

  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [loadingRecsId, setLoadingRecsId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  // Detailed verification status
  const [verificationDetails, setVerificationDetails] = useState({
    isProfileComplete: false,
    isEmailVerified: false,
    isPhoneVerified: false,
    companyName: ""
  });

  const [activeTab, setActiveTab] = useState<'internships' | 'applications'>('internships');
  const [selectedInternship, setSelectedInternship] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;

    // Fetch internships
    api.get<Internship[]>('/employers/my-internships')
      .then(res => setInternships(res))
      .catch(err => console.error("Failed to fetch internships:", err));

    // Fetch profile with consolidated verification status (single API call)
    api.get<any>('/employers/profile')
      .then((profile) => {
        // Use the server-computed is_fully_verified flag
        const verified = Boolean(profile.is_fully_verified);

        console.log("Employer profile:", {
          company_name: profile.company_name,
          is_profile_complete: profile.is_profile_complete,
          is_email_verified: profile.is_email_verified,
          is_phone_verified: profile.is_phone_verified,
          is_fully_verified: verified
        });

        setIsVerified(verified);
        setVerificationDetails({
          isProfileComplete: Boolean(profile.is_profile_complete),
          isEmailVerified: Boolean(profile.is_email_verified),
          isPhoneVerified: Boolean(profile.is_phone_verified),
          companyName: profile.company_name || ""
        });
      })
      .catch((err) => {
        console.error("Profile fetch failed:", err);
        setIsVerified(false);
      });

    // Load applications for internships (on-demand, not polling)
    // The loadApplications function is called when user clicks "Applications" button
  }, [token]);

  async function handlePostJob(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (!isVerified) {
      setError("You must complete your profile and be verified to post internships.");
      console.log("Post blocked: isVerified is false");
      return;
    }

    // Validate required fields
    if (!title.trim()) {
      setError("Please enter a job title.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter a location.");
      return;
    }

    setMessage(null);
    setError(null);
    setLoading(true);

    const jobData = {
      title: title || "",
      description: description || "",
      location: location || "",
      mode: mode || "remote",
      duration_weeks: Number(duration) || 8,
      stipend_amount: stipendAmount === "" || isNaN(stipendAmount as number) ? null : Number(stipendAmount),
      deadline: deadline || null,
      start_date: startDate || null,
      skills: typeof skills === 'string' ? skills.split(",").map(s => s.trim()).filter(s => s !== "") : [],
      openings: Number(openings) || 1,
      qualifications: qualifications || "",
      benefits: typeof benefits === 'string' ? benefits.split(",").map(s => s.trim()).filter(s => s !== "") : [],
      contact_name: contactName || "",
      contact_email: contactEmail || "",
      contact_phone: contactPhone || "",
      application_link: applicationLink || "",
      application_email: applicationEmail || "",
      policy: policy || "UGC"
    };

    console.log("Posting Internship Data:", jobData);

    try {
      await api.post('/employers/internships', jobData);
      setMessage("Internship posted successfully!");
      setShowPostModal(false);
      // Refresh internships
      const internships = await api.get<Internship[]>('/employers/my-internships');
      setInternships(internships);
      // Clear form
      setTitle("");
      setDescription("");
      setLocation("");
      setMode("remote");
      setDuration(8);
      setStipendAmount("");
      setDeadline("");
      setStartDate("");
      setSkills("");
      setOpenings(1);
      setQualifications("");
      setBenefits("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setApplicationEmail("");
      setApplicationLink("");

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to post internship:", err);
      const errorMsg = err.message || "Could not post internship. Please try again later.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function loadApplications(internshipId: number) {
    if (!token) return;
    setLoadingId(internshipId);
    setMessage(null);
    // Don't clear existing error here, as it might be from another operation

    try {
      const apps = await api.get<Application[]>(`/employers/internships/${internshipId}/applications`);
      setApplicationsByInternship((prev) => ({
        ...prev,
        [internshipId]: apps
      }));
      // Clear error if successful
      setError(null);
    } catch (err: any) {
      console.error("Failed to load applications:", err);
      const errorMsg = err.message || "Could not load applications. Please try again later.";
      setError(errorMsg);
    } finally {
      setLoadingId(null);
    }
  }

  async function loadRecommendations(internshipId: number) {
    if (!token) return;
    setLoadingRecsId(internshipId);
    setMessage(null);
    setError(null);

    try {
      const recs = await api.get<RecommendedStudent[]>(`/employers/internships/${internshipId}/recommended-students`);
      setRecommendationsByInternship((prev) => ({
        ...prev,
        [internshipId]: recs
      }));
    } catch (err: any) {
      console.error("Failed to load recommendations:", err);
      const errorMsg = err.message || "Could not load recommendations. Please try again later.";
      setError(errorMsg);
    } finally {
      setLoadingRecsId(null);
    }
  }

  async function updateStatus(applicationId: number, status: string, internshipId: number) {
    if (!token) return;
    setUpdatingStatusId(applicationId);
    setMessage(null);
    setError(null);

    try {
      await api.put(`/employers/applications/${applicationId}/status`, { status });
      setMessage(`Application ${status} successfully!`);

      // Refresh applications list
      const apps = await api.get<Application[]>(`/employers/internships/${internshipId}/applications`);
      setApplicationsByInternship((prev) => ({
        ...prev,
        [internshipId]: apps
      }));

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to update application status:", err);
      const errorMsg = err.message || "Could not update status. Please try again later.";
      setError(errorMsg);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function markAsCompleted(applicationId: number, internshipId: number) {
    if (!token) return;
    const hours = prompt("Enter total hours worked by the student:");
    if (!hours || isNaN(Number(hours))) {
      alert("Please enter a valid number of hours.");
      return;
    }

    const policyType = prompt("Enter policy type (UGC or AICTE):", "UGC")?.toUpperCase();
    if (policyType !== "UGC" && policyType !== "AICTE") {
      alert("Please enter either UGC or AICTE.");
      return;
    }

    setUpdatingStatusId(applicationId);
    try {
      await api.put(`/employers/applications/${applicationId}/complete`, {
        hours_worked: parseInt(hours),
        policy_type: policyType
      });
      setMessage("Internship marked as completed!");
      loadApplications(internshipId);
    } catch (err: any) {
      setError(err.message || "Failed to mark as completed");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  function formatDate(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-teal-100/50 blur-3xl"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-3xl"></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 relative z-10 space-y-6">
        <header className="flex items-center justify-between bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Hi, {user?.full_name?.split(' ')[0] || 'Employer'}! 👋</h1>
            <p className="text-sm text-slate-600">
              Employer Dashboard • Post internships and manage applications
            </p>
          </div>
          <button
            onClick={() => {
              setShowPostModal(true);
            }}
            className="flex items-center gap-2 bg-teal-50 border border-teal-100 text-teal-700 px-8 py-4 rounded-xl font-bold text-xl hover:bg-teal-100 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Post Job
          </button>
          <button
            onClick={() => {
              logout();
              window.location.href = "/";
            }}
            className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 rounded-xl font-medium hover:bg-rose-100 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Logout
          </button>
        </header>

        {!isVerified && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl shadow-sm animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-amber-800 mb-2">⚠️ Action Required: Complete Your Profile</h3>
                <p className="text-amber-700 mb-3">
                  You need to complete verification before you can post internships.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${verificationDetails.isProfileComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {verificationDetails.isProfileComplete ? '✓' : '○'} Profile Complete
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${verificationDetails.isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {verificationDetails.isEmailVerified ? '✓' : '○'} Email Verified
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${verificationDetails.isPhoneVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {verificationDetails.isPhoneVerified ? '✓' : '○'} Phone Verified
                  </span>
                </div>
              </div>
              <Link
                to="/employer/setup"
                className="whitespace-nowrap px-6 py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Complete Profile →
              </Link>
            </div>
          </div>
        )}

        {isVerified && verificationDetails.companyName && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <h3 className="font-bold text-emerald-800">{verificationDetails.companyName}</h3>
                <p className="text-sm text-emerald-700">Verified employer • Ready to post internships</p>
              </div>
            </div>
          </div>
        )}

        {(message || error) && (
          <div
            className={`rounded-xl px-6 py-4 text-sm font-medium shadow-sm flex items-center gap-2 ${error
              ? "bg-rose-50 text-rose-700 border border-rose-100"
              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
              }`}
          >
            {error ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            )}
            {error || message}
          </div>
        )}

        <section className="space-y-6">
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-sm min-h-[500px]">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              </span>
              My Internships
            </h2>

            {internships.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <div className="bg-slate-100 p-4 rounded-full mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                </div>
                <p>No internships posted yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {internships.map((job) => (
                  <div key={job.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all hover:border-blue-200 group">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-4">
                            <h3 className="font-bold text-2xl text-slate-900 leading-tight" title={job.title}>{job.title}</h3>
                            <span className={`px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider shrink-0 ${
                              job.mode === 'remote' ? 'bg-purple-100 text-purple-700' :
                              job.mode === 'onsite' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {job.mode}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-slate-600 text-base">
                            <div className="flex items-center" title="Duration">
                               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 shrink-0"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                               {job.duration_weeks} weeks
                            </div>
                            {job.stipend_amount !== undefined && (
                              <div className="flex items-center font-medium text-slate-800" title="Stipend">
                                <span className="mr-1 text-xl">₹</span>
                                <span className="text-lg">{job.stipend_amount ? job.stipend_amount.toLocaleString() : 'Unpaid'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-start text-slate-600 text-base mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 mt-1 shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          <span className="leading-relaxed">{job.location}</span>
                        </div>

                        {job.description && (
                          <p className="text-base text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                            {job.description}
                          </p>
                        )}

                        {job.skills && (
                          <div className="flex flex-wrap gap-2.5">
                            {job.skills.split(',').slice(0, 8).map((skill, i) => (
                              <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg border border-slate-200">
                                {skill.trim()}
                              </span>
                            ))}
                            {job.skills.split(',').length > 8 && (
                              <span className="px-3 py-1.5 bg-slate-50 text-slate-500 text-sm font-medium rounded-lg border border-slate-100">
                                +{job.skills.split(',').length - 8}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex lg:flex-col gap-3 justify-center min-w-[200px] border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                        <Link
                          to={`/employer/internship/${job.id}`}
                          className="inline-flex justify-center items-center rounded-xl bg-slate-50 border border-slate-200 px-6 py-3 text-base font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all w-full"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => loadApplications(job.id)}
                          className="inline-flex justify-center items-center rounded-xl bg-blue-50 border border-blue-200 px-6 py-3 text-base font-bold text-blue-700 hover:bg-blue-100 transition-all w-full"
                        >
                          {loadingId === job.id ? "..." : "Applications"}
                        </button>
                        <button
                          onClick={() => loadRecommendations(job.id)}
                          className="inline-flex justify-center items-center rounded-xl bg-teal-50 border border-teal-200 px-6 py-3 text-base font-bold text-teal-700 hover:bg-teal-100 transition-all w-full"
                        >
                          {loadingRecsId === job.id ? "..." : "AI Matches"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {/* Applications Display */}
              {internships.map((job) => {
                const apps = applicationsByInternship[job.id] || [];
                if (apps.length === 0) return null;
                return (
                  <div key={`apps-${job.id}`} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                      <p className="font-bold text-slate-800 text-sm">Applications for {job.title}</p>
                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{apps.length}</span>
                    </div>
                    <div className="p-2">
                      {apps.length === 0 ? (
                        <p className="text-center text-slate-400 py-4 text-xs">No applications yet.</p>
                      ) : (
                        <>
                          {/* Pending Applications */}
                          {apps.filter(app => app.status === "pending").length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-1">Pending Applications</h4>
                              {apps.filter(app => app.status === "pending").map((app) => (
                                <div key={app.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 mb-2 last:mb-0 group">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0">
                                      {app.student.first_name?.[0] || 'S'}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-800 text-sm">
                                          {app.student.first_name} {app.student.last_name}
                                        </p>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                          Pending
                                        </span>
                                      </div>
                                      <p className="text-slate-500 text-xs mt-0.5">{app.student.university_name || 'University not specified'}</p>
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {(app.student.skills?.split(',') || []).slice(0, 3).map((skill, i) => (
                                          <span key={i} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                            {skill.trim()}
                                          </span>
                                        ))}
                                        {(app.student.skills?.split(',') || []).length > 3 && (
                                          <span className="text-[9px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                                            +{(app.student.skills?.split(',') || []).length - 3}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        Applied on {formatDate(app.applied_at)}
                                      </p>
                                      
                                      <div className="flex gap-2 mt-3">
                                        {app.student.resume_file_path && (
                                            <a
                                                href={`http://127.0.0.1:8000/students/resume/download/${app.student.resume_file_path.split('/').pop()}`}
                                                target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            Uploaded Resume
                                          </a>
                                        )}
                                        {app.student.resume_json && (
                                          <Link 
                                            to={`/employer/student-resume/${app.student.id}`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-[11px] font-bold hover:bg-teal-100 transition-colors border border-teal-100"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                            Created Resume
                                          </Link>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => updateStatus(app.id, "accepted", job.id)}
                                      disabled={updatingStatusId === app.id}
                                      className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50"
                                    >
                                      {updatingStatusId === app.id ? "..." : "Accept"}
                                    </button>
                                    <button
                                      onClick={() => updateStatus(app.id, "rejected", job.id)}
                                      disabled={updatingStatusId === app.id}
                                      className="bg-white border border-rose-200 text-rose-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-50 transition-all disabled:opacity-50"
                                    >
                                      {updatingStatusId === app.id ? "..." : "Reject"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Accepted Applications */}
                          {apps.filter(app => app.status === "accepted").length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-1">Accepted Applications</h4>
                              {apps.filter(app => app.status === "accepted").map((app) => (
                                <div key={app.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 mb-2 last:mb-0 group">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-green-100 text-green-600 w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0">
                                      {app.student.first_name?.[0] || 'S'}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-800 text-sm">
                                          {app.student.first_name} {app.student.last_name}
                                        </p>
                                        <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                          Accepted
                                        </span>
                                      </div>
                                      <p className="text-slate-500 text-xs mt-0.5">{app.student.university_name || 'University not specified'}</p>
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {(app.student.skills?.split(',') || []).slice(0, 3).map((skill, i) => (
                                          <span key={i} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                            {skill.trim()}
                                          </span>
                                        ))}
                                        {(app.student.skills?.split(',') || []).length > 3 && (
                                          <span className="text-[9px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                                            +{(app.student.skills?.split(',') || []).length - 3}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        Applied on {formatDate(app.applied_at)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => updateStatus(app.id, "rejected", job.id)}
                                      disabled={updatingStatusId === app.id}
                                      className="bg-white border border-rose-200 text-rose-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-50 transition-all disabled:opacity-50"
                                    >
                                      {updatingStatusId === app.id ? "..." : "Reject"}
                                    </button>
                                    <button
                                      onClick={() => markAsCompleted(app.id, job.id)}
                                      disabled={updatingStatusId === app.id}
                                      className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-700 transition-all shadow-sm shadow-teal-200 disabled:opacity-50"
                                    >
                                      {updatingStatusId === app.id ? "..." : "Complete"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Rejected Applications */}
                          {apps.filter(app => app.status === "rejected").length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-1">Rejected Applications</h4>
                              {apps.filter(app => app.status === "rejected").map((app) => (
                                <div key={app.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 mb-2 last:mb-0 group opacity-75">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-red-100 text-red-600 w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0">
                                      {app.student.first_name?.[0] || 'S'}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-800 text-sm">
                                          {app.student.first_name} {app.student.last_name}
                                        </p>
                                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                          Rejected
                                        </span>
                                      </div>
                                      <p className="text-slate-500 text-xs mt-0.5">{app.student.university_name || 'University not specified'}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Completed Applications */}
                          {apps.filter(app => app.status === "completed").length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-1">Completed Internships</h4>
                              {apps.filter(app => app.status === "completed").map((app) => (
                                <div key={app.id} className="flex items-center justify-between p-4 bg-teal-50/30 rounded-xl border border-teal-100 mb-2 last:mb-0 group">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-teal-100 text-teal-600 w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0">
                                      {app.student.first_name?.[0] || 'S'}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-800 text-sm">
                                          {app.student.first_name} {app.student.last_name}
                                        </p>
                                        <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                          Completed
                                        </span>
                                      </div>
                                      <p className="text-slate-500 text-xs mt-0.5">{app.student.university_name || 'University not specified'}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* AI Recommendations Display */}
              {internships.map((job) => {
                const recs = recommendationsByInternship[job.id] || [];
                if (recs.length === 0) return null;
                return (
                  <div key={`recs-${job.id}`} className="rounded-xl border border-teal-100 bg-teal-50/50 overflow-hidden">
                    <div className="bg-teal-100/50 px-4 py-3 border-b border-teal-200 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                      <p className="font-bold text-teal-900 text-sm">AI Matches for {job.title}</p>
                    </div>
                    <div className="p-4 space-y-4">
                      {recs.map((rec) => (
                        <div key={rec.student_id} className="bg-white p-4 rounded-xl border border-teal-100 shadow-sm relative group hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-slate-800">{rec.student_name}</p>
                              <p className="text-xs text-slate-500">Based on profile analysis</p>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="bg-teal-600 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-sm shadow-teal-200">{rec.match_score}% Match</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {rec.matching_skills.map((s, i) => (
                              <span key={i} className="bg-teal-50 text-teal-700 border border-teal-100 px-2 py-1 rounded text-[10px] font-bold">{s}</span>
                            ))}
                            {rec.missing_skills.map((s, i) => (
                              <span key={i} className="bg-rose-50 text-rose-400 border border-rose-100 px-2 py-1 rounded text-[10px] opacity-70">{s} (missing)</span>
                            ))}
                          </div>

                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Matching Analysis</p>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">Skills Match</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${rec.explanation?.rule_based_score}%` }}></div>
                                  </div>
                                  <span className="font-bold text-slate-700">{rec.explanation?.rule_based_score}%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">Semantic</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{ width: `${rec.explanation?.embedding_score}%` }}></div>
                                  </div>
                                  <span className="font-bold text-slate-700">{rec.explanation?.embedding_score}%</span>
                                </div>
                              </div>
                              {rec.cross_encoder_score !== undefined && (
                                <div className="flex justify-between items-center col-span-2 border-t border-slate-100 pt-2 mt-1">
                                  <span className="text-teal-600 font-bold flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    Deep AI Analysis
                                  </span>
                                  <span className="font-black text-teal-700 text-sm">{rec.cross_encoder_score}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
        </section>
      </div>

      {/* Post Internship Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-scaleIn">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Post New Internship</h3>
              <button
                onClick={() => setShowPostModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <form onSubmit={handlePostJob} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                  placeholder="e.g. Frontend Developer Intern"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all min-h-[100px]"
                  placeholder="Describe the role, responsibilities, and requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                    placeholder="e.g. Bangalore"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 transition-all text-sm font-medium flex items-center gap-1"
                  >
                    {isLocating ? "..." : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        Current
                      </>
                    )}
                  </button>
                </div>
                <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-200 mb-4 z-0">
                  <MapContainer
                    center={mapPosition}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    {/* Use CartoDB tile server which is more reliable */}
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      subdomains={['a', 'b', 'c', 'd']}
                    />
                    <LocationPicker position={mapPosition} setPosition={setMapPosition} setLocation={setLocation} />
                  </MapContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all bg-white"
                  >
                    <option value="remote">Remote</option>
                    <option value="onsite">On-site</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Weeks)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      // Only set value if it's a valid number and within range
                      if (!isNaN(value) && value >= 1 && value <= 52) {
                        setDuration(value);
                      }
                    }}
                    min="1"
                    max="52"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stipend (Monthly)</label>
                  <input
                    type="number"
                    value={stipendAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        setStipendAmount("");
                      } else {
                        const numValue = Number(value);
                        // Only set value if it's a valid number
                        if (!isNaN(numValue)) {
                          setStipendAmount(numValue);
                        }
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Qualifications</label>
                <textarea
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all min-h-[80px]"
                  placeholder="Required education, certifications, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Benefits</label>
                <input
                  type="text"
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                  placeholder="e.g. Certificate, Letter of recommendation, Flexible hours (comma separated)"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all text-sm"
                      placeholder="HR Manager Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all text-sm"
                      placeholder="+91..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all text-sm"
                      placeholder="hr@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Application Email</label>
                    <input
                      type="email"
                      value={applicationEmail}
                      onChange={(e) => setApplicationEmail(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all text-sm"
                      placeholder="apply@company.com"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                  placeholder="e.g. React, Python, SQL (comma separated)"
                />
                <p className="text-xs text-slate-500 mt-1">Separate skills with commas</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Openings</label>
                  <input
                    type="number"
                    value={openings}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      // Only set value if it's a valid number and within range
                      if (!isNaN(value) && value >= 1 && value <= 100) {
                        setOpenings(value);
                      }
                    }}
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">External Link (Optional)</label>
                  <input
                    type="url"
                    value={applicationLink}
                    onChange={(e) => setApplicationLink(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Posting...
                    </>
                  ) : (
                    "Post Internship"
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
