
import { useEffect, useState } from "react";
import axios from "axios";
import { PublicNavbar } from "../components/PublicNavbar";
import { useNavigate } from "react-router-dom";

interface Internship {
  id: number;
  title: string;
  description: string;
  location: string;
  mode: string;
  duration_weeks: number;
  employer_id: number;
}

export function BrowseInternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchInternships();
  }, [search, locationFilter, modeFilter]);

  const fetchInternships = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (locationFilter) params.append("location", locationFilter);
      if (modeFilter) params.append("mode", modeFilter);

      const res = await axios.get(`/students/internships?${params.toString()}`);
      setInternships(res.data);
    } catch (error) {
      console.error("Failed to fetch internships", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <PublicNavbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Browse Internships</h1>
            <p className="text-lg text-slate-600">Find the perfect opportunity to kickstart your career.</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <span className="absolute left-3 top-3 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </span>
                <input 
                    type="text" 
                    placeholder="Search by role, skill, or company..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="w-full md:w-48">
                <input 
                    type="text" 
                    placeholder="Location (e.g. Delhi)" 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                />
            </div>
            <div className="w-full md:w-48">
                <select 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    value={modeFilter}
                    onChange={(e) => setModeFilter(e.target.value)}
                >
                    <option value="">All Modes</option>
                    <option value="remote">Remote</option>
                    <option value="office">In-Office</option>
                    <option value="hybrid">Hybrid</option>
                </select>
            </div>
        </div>

        {/* Results */}
        {loading ? (
            <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500">Loading internships...</p>
            </div>
        ) : internships.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No internships found</h3>
                <p className="text-slate-500">Try adjusting your search filters.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {internships.map(internship => (
                    <div key={internship.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow group relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 group-hover:text-teal-600 transition-colors line-clamp-1">{internship.title}</h3>
                                <p className="text-sm text-slate-500">Duration: {internship.duration_weeks} Weeks</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full border ${
                                internship.mode === 'remote' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                                {internship.mode}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            {internship.location}
                        </div>

                        <p className="text-sm text-slate-600 mb-6 line-clamp-2">
                            {internship.description || "No description available."}
                        </p>

                        <button 
                            onClick={() => navigate(`/student/internship/${internship.id}`)}
                            className="w-full py-2 bg-slate-50 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 group-hover:border-teal-200 group-hover:bg-teal-50 group-hover:text-teal-700"
                        >
                            View Details
                        </button>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  );
}