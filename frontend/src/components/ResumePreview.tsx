
import React from 'react';

export interface Education {
  id: string;
  degree: string;
  department: string;
  university: string;
  start_year: string;
  end_year: string;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface ExtraCurricular {
  id: string;
  activity: string;
  description: string;
}

interface ResumePreviewProps {
  data: {
    full_name?: string;
    email?: string;
    phone?: string;
    current_city?: string;
    objective: string;
    skills: string[];
    educations: Education[];
    experiences: Experience[];
    projects: Project[];
    certifications: Certification[];
    extraCurricular: ExtraCurricular[];
  };
  scale?: number;
  isPrintMode?: boolean;
}

export function ResumePreview({ data, scale = 0.7, isPrintMode = false }: ResumePreviewProps) {
  const {
    full_name, email, phone, current_city,
    objective, skills, educations, experiences,
    projects, certifications, extraCurricular
  } = data;

  return (
    <div 
      className={`bg-white shadow-2xl rounded-sm mx-auto overflow-hidden border border-slate-200 print:shadow-none print:border-none print:m-0`} 
      style={isPrintMode ? { 
        width: '210mm', 
        minHeight: '297mm',
      } : { 
        width: '210mm', 
        minHeight: '297mm', 
        transform: `scale(${scale})`, 
        transformOrigin: 'top center' 
      }}
    >
      <div className="p-[20mm] text-slate-800 font-serif leading-tight">
        {/* Resume Header */}
        <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
          <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">{full_name || "YOUR NAME"}</h1>
          <div className="flex justify-center gap-4 text-xs font-medium text-slate-600">
            <span>{email || "email@example.com"}</span>
            <span>•</span>
            <span>{phone || "+91 0000000000"}</span>
            <span>•</span>
            <span>{current_city || "City, Country"}</span>
          </div>
        </div>

        {/* Resume Summary */}
        {objective && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase border-b border-slate-300 mb-3 pb-1">Professional Summary</h2>
            <p className="text-[11px] leading-relaxed text-slate-700 italic">{objective}</p>
          </div>
        )}

        {/* Resume Skills */}
        {skills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase border-b border-slate-300 mb-3 pb-1">Technical Skills</h2>
            <p className="text-[11px] leading-relaxed text-slate-700">
              {skills.join(', ')}
            </p>
          </div>
        )}

        {/* Resume Experience */}
        {experiences.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase border-b border-slate-300 mb-4 pb-1">Work Experience</h2>
            <div className="space-y-6">
              {experiences.map(exp => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-xs font-bold">{exp.role}</h3>
                    <span className="text-[10px] italic">{exp.start_date} — {exp.end_date}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 mb-2 uppercase">{exp.company}</p>
                  <p className="text-[10px] leading-relaxed text-slate-600 pl-4 border-l border-slate-100 whitespace-pre-line">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resume Education */}
        {educations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase border-b border-slate-300 mb-4 pb-1">Education</h2>
            <div className="space-y-4">
              {educations.map(edu => (
                <div key={edu.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-xs font-bold">{edu.degree}</h3>
                    <span className="text-[10px] italic">{edu.start_year} — {edu.end_year}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 uppercase">{edu.university}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resume Projects */}
        {projects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase border-b border-slate-300 mb-4 pb-1">Key Projects</h2>
            <div className="space-y-4">
              {projects.map(proj => (
                <div key={proj.id}>
                  <h3 className="text-xs font-bold mb-1">{proj.title}</h3>
                  <p className="text-[10px] text-slate-600 italic mb-1">{proj.technologies}</p>
                  <p className="text-[10px] leading-relaxed text-slate-600 whitespace-pre-line">{proj.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resume Certifications */}
        {certifications.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase border-b border-slate-300 mb-3 pb-1">Certifications</h2>
            <ul className="list-disc pl-4 space-y-1">
              {certifications.map(cert => (
                <li key={cert.id} className="text-[10px] text-slate-700">
                  <span className="font-bold">{cert.name}</span> — {cert.issuer} ({cert.year})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resume Extra-Curricular */}
        {extraCurricular.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase border-b border-slate-300 mb-3 pb-1">Extra-Curricular Activities</h2>
            <div className="space-y-3">
              {extraCurricular.map(extra => (
                <div key={extra.id}>
                  <h3 className="text-[10px] font-bold uppercase">{extra.activity}</h3>
                  <p className="text-[10px] leading-relaxed text-slate-600 whitespace-pre-line">{extra.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
