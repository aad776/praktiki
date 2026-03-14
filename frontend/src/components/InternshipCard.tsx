
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Internship {
  id: number;
  employer_id: number;
  title: string;
  description?: string;
  location: string;
  mode: string;
  duration_weeks: number;
  deadline?: string;
  skills?: string;
  stipend_amount?: number;
  created_at?: string;
  company_name?: string;
  logo_url?: string;
}

interface InternshipCardProps {
  internship: Internship;
}

export const InternshipCard: React.FC<InternshipCardProps> = ({ internship }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return `Posted ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getDaysLeft = (deadline?: string) => {
    if (!deadline) return 'Ongoing';
    const end = new Date(deadline);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Expired';
    return `${diffDays} days left`;
  };

  const skillsList = internship.skills ? internship.skills.split(',').map(s => s.trim()) : [];
  
  // Format stipend
  const formatStipend = (amount?: number) => {
    if (!amount) return 'Unpaid';
    return `₹${amount.toLocaleString('en-IN')} / Month`;
  };

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 relative group cursor-pointer"
      onClick={() => navigate(`/internship/${internship.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/internship/${internship.id}`);
        }
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 
            className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer mb-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/internship/${internship.id}`);
            }}
          >
            {internship.title}
          </h3>
          <p className="text-slate-600 font-medium">{internship.company_name || 'Unknown Company'}</p>
        </div>
        <div className="w-12 h-12 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
            {internship.logo_url && !imgError ? (
                <img 
                  src={internship.logo_url} 
                  alt={internship.company_name} 
                  className="w-full h-full object-contain" 
                  onError={() => setImgError(true)}
                />
            ) : (
                <span className="text-xl font-bold text-slate-300">
                    {internship.company_name?.charAt(0) || 'C'}
                </span>
            )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-4 items-center">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          No prior experience required
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {internship.duration_weeks > 8 ? 'Full Time' : 'Part Time'}
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {internship.mode}
        </div>
      </div>

      {/* Skills Row */}
      {skillsList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-slate-600">
            {skillsList.slice(0, 3).map((skill, idx) => (
                <span key={idx} className="hover:text-blue-600 cursor-default">{skill}</span>
            ))}
            {skillsList.length > 3 && (
                <span className="text-slate-400">+{skillsList.length - 3}</span>
            )}
        </div>
      )}

      {/* Tags/Badges Row - Mocked for visual similarity if no category data */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['Software Development', 'Frontend Development', 'Backend Development'].slice(0, 2).map((tag, idx) => (
            <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium hover:bg-slate-200 transition-colors cursor-pointer">
                {tag}
            </span>
        ))}
        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium hover:bg-slate-200 transition-colors cursor-pointer">
            +5
        </span>
      </div>

      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded text-sm font-semibold flex items-center gap-1">
                {formatStipend(internship.stipend_amount)}
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-xs font-medium">
        <div className="flex items-center gap-4">
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {formatDate(internship.created_at)}
            </span>
            <span className="text-blue-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {getDaysLeft(internship.deadline)}
            </span>
        </div>
        <div className="flex items-center gap-3">
            <button className="text-slate-400 hover:text-blue-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
            <button className="text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
        </div>
      </div>
    </div>
  );
};
