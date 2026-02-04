import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Metrics {
  total_applicants: number;
  completed_internships: number;
  accepted_applications: number;
  rejected_applications: number;
  ongoing_programs: number;
}

export function EmployerStatus() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    api.get<Metrics>("/employers/dashboard/metrics")
      .then(setMetrics)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const total = metrics?.total_applicants || 0;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Company Status</h1>
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 px-6 py-4 mb-6">{error}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">Total Applicants</p>
            <p className="text-3xl font-bold text-slate-900">{metrics?.total_applicants ?? "-"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">Ongoing</p>
            <p className="text-3xl font-bold text-blue-700">{metrics?.ongoing_programs ?? "-"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">Completed</p>
            <p className="text-3xl font-bold text-indigo-700">{metrics?.completed_internships ?? "-"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">Accepted</p>
            <p className="text-3xl font-bold text-emerald-700">{metrics?.accepted_applications ?? "-"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">Rejected</p>
            <p className="text-3xl font-bold text-rose-700">{metrics?.rejected_applications ?? "-"}</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-sm font-bold text-slate-800 mb-3">Acceptance Rate</p>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600" style={{ width: `${pct(metrics?.accepted_applications || 0)}%` }}></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{pct(metrics?.accepted_applications || 0)}%</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-sm font-bold text-slate-800 mb-3">Rejection Rate</p>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-rose-600" style={{ width: `${pct(metrics?.rejected_applications || 0)}%` }}></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{pct(metrics?.rejected_applications || 0)}%</p>
          </div>
        </div>
        {loading && <div className="mt-6 text-slate-500">Loading...</div>}
      </div>
    </div>
  );
}
