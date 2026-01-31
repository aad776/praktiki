import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface Internship {
  id: number;
  title: string;
  company_name: string;
  location: string;
  mode: string;
  duration_weeks: number;
}

interface InstituteStudentRow {
  id: number;
  name: string;
  department: string | null;
  year: number | null;
  apaar_id: string | null;
  is_apaar_verified: boolean;
  status: "Verified" | "Pending";
  internships: Internship[];
  total_internships: number;
}

export function InstituteDashboard() {
  const { token, logout } = useAuth();
  const [students, setStudents] = useState<InstituteStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    
    const client = axios.create({
      baseURL: "http://127.0.0.1:8000",
      headers: { Authorization: `Bearer ${token}` }
    });

    client.get("/institutes/students")
      .then((res) => {
        setStudents(res.data);
        if (res.data.length === 0) {
          setMessage("No students found for your institute.");
        }
      })
      .catch((err: any) => {
        console.error("Failed to load students:", err);
        const errorMsg = err.response?.data?.detail || "Could not load students. Please try again later.";
        setError(errorMsg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="mx-auto max-w-5xl py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Institute Dashboard</h1>
          <p className="text-sm text-slate-600">
            View students and their placement/verification status.
          </p>
        </div>
        <button
          onClick={() => {
            logout();
            window.location.href = "/";
          }}
          className="inline-flex items-center rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          Logout
        </button>
      </header>

      {(message || error) && (
        <div
          className={`rounded-md px-4 py-2 text-xs ${error ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}
        >
          {error || message}
        </div>
      )}
      
      <section className="rounded-lg bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">
          Students
        </h2>
        
        {loading ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-2"></div>
            <p className="text-slate-500 text-sm">Loading students...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {students.map((s) => (
              <div key={s.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-slate-900">{s.name}</h3>
                    <span
                      className={
                        s.status === "Verified"
                          ? "inline-flex rounded-full bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700 border border-sky-200"
                          : "inline-flex rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 border border-slate-200"
                      }
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-1">Department</span>
                      <span className="text-slate-800 font-medium">{s.department ?? "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Year</span>
                      <span className="text-slate-800 font-medium">{s.year ?? "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">APAAR ID</span>
                      <span className="text-slate-800 font-medium">{s.apaar_id ?? "Not provided"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Internships</span>
                      <span className="text-slate-800 font-medium">{s.total_internships}</span>
                    </div>
                  </div>
                  
                  {s.total_internships > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-700 mb-2">Current Internships</h4>
                      <div className="space-y-2">
                        {s.internships.map((internship) => (
                          <div key={internship.id} className="border-l-2 border-slate-300 pl-3 py-1">
                            <div className="text-xs font-medium text-slate-900">{internship.title}</div>
                            <div className="text-xs text-slate-600">{internship.company_name}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {internship.location} • {internship.mode} • {internship.duration_weeks} weeks
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {students.length === 0 && !message && !error && (
              <div className="py-8 text-center">
                <p className="text-slate-500 text-sm">No students found.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

