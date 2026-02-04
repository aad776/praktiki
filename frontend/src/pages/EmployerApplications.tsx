import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Applicant {
  id: number;
  internship_id: number;
  status: string;
  applied_at: string;
  student_name: string;
  internship_title: string;
}

export function EmployerApplications() {
  const { token } = useAuth();
  const [applications, setApplications] = useState<Applicant[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    api.get<Applicant[]>("/employers/applications/all")
      .then(setApplications)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    return applications.filter(a => {
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const name = a.student_name.toLowerCase();
      const matchesSearch = !search || name.includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [applications, statusFilter, search]);

  const toggle = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const bulkUpdate = async (status: string) => {
    if (!selected.length) return;
    setLoading(true);
    setError(null);
    try {
      await api.post("/employers/applications/bulk-status", { application_ids: selected, status });
      const next = applications.map(a => selected.includes(a.id) ? { ...a, status } : a);
      setApplications(next);
      setSelected([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOne = async (id: number, status: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/employers/applications/${id}/status`, { status });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Applications Management</h1>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex items-center gap-3">
          <input
            placeholder="Search by student name"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          {selected.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => bulkUpdate("accepted")}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Accept ({selected.length})
              </button>
              <button
                onClick={() => bulkUpdate("rejected")}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                Reject ({selected.length})
              </button>
            </div>
          )}
        </div>
        
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 px-6 py-4 mb-6">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Select</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Internship</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Applied Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(app => (
                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selected.includes(app.id)}
                      onChange={() => toggle(app.id)}
                      className="w-4 h-4 text-brand-600 rounded"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{app.student_name}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{app.internship_title}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                      app.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateOne(app.id, 'accepted')}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => updateOne(app.id, 'rejected')}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 italic">
              No applications found matching your criteria.
            </div>
          )}
        </div>
        {loading && <div className="mt-6 text-slate-500 text-center">Processing...</div>}
      </div>
    </div>
  );
}
