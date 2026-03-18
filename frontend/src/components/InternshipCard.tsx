
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
      className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 relative group cursor-pointer flex flex-col h-full hover:border-brand-200"
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
      <div className="flex justify-between items-start mb-5">
        <div className="flex-1 min-w-0">
          <h3 
            className="text-lg md:text-xl font-black text-slate-900 group-hover:text-brand-600 transition-colors cursor-pointer mb-1 truncate leading-tight"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/internship/${internship.id}`);
            }}
          >
            {internship.title}
          </h3>
          <p className="text-sm text-slate-500 font-bold truncate">{internship.company_name || 'Unknown Company'}</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-brand-100 flex-shrink-0 ml-4">
            {internship.logo_url && !imgError ? (
                <img 
                  src={internship.logo_url} 
                  alt={internship.company_name} 
                  className="w-full h-full object-contain p-2" 
                  onError={() => setImgError(true)}
                />
            ) : (
                <span className="text-2xl font-black text-slate-300 group-hover:text-brand-300">
                    {internship.company_name?.charAt(0) || 'C'}
                </span>
            )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-5 items-center font-bold uppercase tracking-wider">
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {internship.location}
        </div>
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {internship.mode}
        </div>
      </div>

      {/* Skills Row */}
      {skillsList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
            {skillsList.slice(0, 3).map((skill, idx) => (
                <span key={idx} className="px-3 py-1 bg-brand-50/50 text-brand-700 rounded-lg text-xs font-black border border-brand-100 uppercase tracking-tight">{skill}</span>
            ))}
            {skillsList.length > 3 && (
                <span className="text-slate-400 text-xs font-bold">+{skillsList.length - 3} more</span>
            )}
        </div>
      )}

      <div className="mt-auto">
        <div className="flex items-center justify-between mb-4">
            <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-black flex items-center gap-2 border border-emerald-100">
                <span className="text-lg">₹</span>
                {formatStipend(internship.stipend_amount)}
            </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[11px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-4">
                <span className="text-slate-400">
                    {formatDate(internship.created_at)}
                </span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {getDaysLeft(internship.deadline)}
                </span>
            </div>
            <button className="p-2 text-slate-400 hover:text-brand-600 transition-all hover:bg-brand-50 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
        </div>
      </div>
    </div>
  );
};
