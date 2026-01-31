import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface InternshipDetails {
  id: number;
  title: string;
  description: string | null;
  location: string;
  mode: string;
  duration_weeks: number;
  employer: {
    company_name: string;
    contact_number: string;
  };
}

export function InternshipDetails() {
  const { token } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [internship, setInternship] = useState<InternshipDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  const internshipId = parseInt(id || "", 10);

  function createClient() {
    return axios.create({
      baseURL: "http://127.0.0.1:8000",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  useEffect(() => {
    if (!token || isNaN(internshipId)) {
      navigate("/");
      return;
    }

    const client = createClient();
    
    // Fetch internship details
    client.get(`/students/internships/${internshipId}`)
      .then((res) => {
        setInternship(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load internship details");
        setLoading(false);
        console.error(err);
      });
    
    // Check if already applied
    client.get("/students/my-applications")
      .then((res) => {
        const applications = res.data;
        const hasApplied = applications.some((app: any) => app.internship_id === internshipId);
        setAlreadyApplied(hasApplied);
      })
      .catch((err) => {
        console.error("Failed to check applications:", err);
      });
  }, [token, internshipId, navigate]);

  const handleApply = async () => {
    if (!token || isNaN(internshipId)) return;
    
    setApplying(true);
    setApplyMessage(null);
    setApplyError(null);
    
    try {
      const client = createClient();
      await client.post("/students/apply", { internship_id: internshipId });
      setApplyMessage("Application submitted successfully!");
      setAlreadyApplied(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setApplyError(detail || "Could not submit application");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-slate-500">Loading internship details...</p>
        </div>
      </div>
    );
  }

  if (error || !internship) {
    return (
      <div className="mx-auto max-w-5xl py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-lg font-medium text-red-800">Error</h2>
          <p className="mt-1 text-sm text-red-700">{error || "Internship not found"}</p>
          <button 
            onClick={() => navigate("/student")}
            className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-8 space-y-6">
      <button 
        onClick={() => navigate("/student")}
        className="inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
      >
        ← Back to Dashboard
      </button>
      
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{internship.title}</h1>
              <div className="mt-2 text-lg text-slate-700">{internship.employer.company_name}</div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-800 border border-blue-200">
                {internship.mode}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-800 border border-green-200">
                {internship.location}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-800 border border-purple-200">
                {internship.duration_weeks} weeks
              </span>
            </div>
          </div>
          
          <div className="prose prose-sm max-w-none text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">About the Internship</h2>
            <p>{internship.description || "No description available"}</p>
            
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Company Details</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-medium text-slate-900">Company Name:</span>
                <span>{internship.employer.company_name}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-slate-900">Contact Number:</span>
                <span>{internship.employer.contact_number || "Not provided"}</span>
              </li>
            </ul>
          </div>
          
          <div className="mt-10">
            <button
              onClick={handleApply}
              disabled={alreadyApplied || applying}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${alreadyApplied 
                ? "bg-gray-500 cursor-not-allowed" 
                : "bg-slate-900 hover:bg-slate-800 focus:ring-slate-500"}`}
            >
              {applying ? "Applying..." : alreadyApplied ? "Already Applied" : "Apply Now"}
            </button>
            
            {applyMessage && (
              <p className="mt-3 text-sm text-green-600">{applyMessage}</p>
            )}
            {applyError && (
              <p className="mt-3 text-sm text-red-600">{applyError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}