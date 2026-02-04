import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { PageLoader } from '../components/LoadingSpinner';

// Types
interface StudentInfo {
  id: number;
  name: string;
  department?: string;
  year?: number;
  apaar_id?: string;
  is_apaar_verified: boolean;
  status: string;
  internships: Array<{
    id: number;
    title: string;
    company_name: string;
    location: string;
    mode: string;
    duration_weeks: number;
  }>;
  total_internships: number;
}

export function InstituteDashboard() {
  const toast = useToast();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get<StudentInfo[]>('/institutes/students');
        setStudents(response);
      } catch (err) {
        const error = err as ApiError;
        toast.error(error.message || 'Failed to load students');
      } finally {
        setPageLoading(false);
      }
    };

    fetchStudents();
  }, [toast]);

  // Filter students based on search
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.apaar_id?.includes(searchQuery)
  );

  // Stats
  const verifiedCount = students.filter(s => s.is_apaar_verified).length;
  const withInternships = students.filter(s => s.total_internships > 0).length;

  if (pageLoading) {
    return <PageLoader label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Institute Dashboard</h1>
        <p className="text-slate-600">Monitor your students and their internship progress</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="text-3xl font-bold text-slate-900">{students.length}</div>
          <div className="text-sm text-slate-600">Total Students</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="text-3xl font-bold text-emerald-600">{verifiedCount}</div>
          <div className="text-sm text-slate-600">APAAR Verified</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="text-3xl font-bold text-blue-600">{withInternships}</div>
          <div className="text-sm text-slate-600">With Internships</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-slate-700 mb-1">Search Students</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, department, or APAAR ID..."
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Students Table */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Students ({filteredStudents.length})
          </h2>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500">
              {searchQuery ? 'No students found matching your search.' : 'No students registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    APAAR Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Internships
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-slate-900">{student.name}</div>
                        {student.apaar_id && (
                          <div className="text-xs text-slate-500">APAAR: {student.apaar_id}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {student.department || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {student.year ? `Year ${student.year}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full
                          ${student.is_apaar_verified
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {student.is_apaar_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {student.total_internships > 0 ? (
                        <div>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {student.total_internships} internship{student.total_internships !== 1 ? 's' : ''}
                          </span>
                          {student.internships.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {student.internships.slice(0, 2).map((int) => (
                                <div key={int.id} className="text-xs text-slate-600">
                                  • {int.title} at {int.company_name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default InstituteDashboard;
