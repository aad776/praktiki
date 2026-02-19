import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  User, MapPin, Phone, Mail, Plus, Edit2, Trash2, 
  Sparkles, Download, Save, ChevronDown, ChevronUp,
  Briefcase, GraduationCap, Code, Award, FileText, Lightbulb,
  X, Check, Upload
} from 'lucide-react';
import { getProfile, getResumeSuggestions, StudentProfile, getSkills, updateResume, StudentResume, parseResume } from '../services/students';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Suggestion {
  section: string;
  items: string[];
}

interface Education {
  id: string;
  degree: string;
  department: string;
  university: string;
  start_year: string;
  end_year: string;
}

interface Experience {
  id: string;
  role: string;
  company: string;
  start_date: string;
  end_date: string;
  description: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string;
}

export function ResumeBuilder() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const location = useLocation();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Resume Data State
  const [objective, setObjective] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [suggestions, setSuggestions] = useState<Suggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [location.state]);


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError("File size should be less than 5MB");
      return;
    }

    try {
      setIsParsing(true);
      const parsedData = await parseResume(file);
      
      success("Resume parsed successfully! Updating fields...");
      
      // Update fields with parsed data
      if (parsedData.career_objective) setObjective(parsedData.career_objective);
      if (parsedData.skills && parsedData.skills.length > 0) setSkills(parsedData.skills);
      
      if (parsedData.education && parsedData.education.length > 0) {
        const parsedEdu = parsedData.education.map((e: any, i: number) => ({
          id: Date.now().toString() + i,
          degree: e.degree || '',
          department: '',
          university: e.university || '',
          start_year: e.start_year || '',
          end_year: e.end_year || ''
        }));
        setEducations(parsedEdu);
      }

      if (parsedData.experience && parsedData.experience.length > 0) {
        const parsedExp = parsedData.experience.map((e: any, i: number) => ({
          id: Date.now().toString() + i + 100,
          role: e.role || '',
          company: e.company || '',
          start_date: e.start_date || '',
          end_date: e.end_date || '',
          description: e.description || ''
        }));
        setExperiences(parsedExp);
      }
      
    } catch (error) {
      console.error(error);
      showError("Failed to parse resume. Please try again.");
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const parseJson = (jsonString: string | undefined, fallback: any) => {
    if (!jsonString) return fallback;
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const loadData = async () => {
    try {
      const data = await getProfile();
      console.log('Loaded profile:', data);
      
      if (!data) {
        console.warn('Profile is null or undefined');
        setLoading(false);
        return;
      }

      setProfile(data);
      
      // Check if we have parsed resume data passed from upload (state or session)
      let parsedData = (location.state as any)?.parsedData;
      
      if (!parsedData) {
        const pendingData = sessionStorage.getItem('pending_resume_data');
        if (pendingData) {
            try {
                parsedData = JSON.parse(pendingData);
                sessionStorage.removeItem('pending_resume_data');
                success("Loaded your uploaded resume!");
            } catch (e) {
                console.error("Failed to parse pending resume data", e);
            }
        }
      }
      
      if (parsedData) {
        success("Resume parsed successfully! Please review the data.");
        setObjective(parsedData.career_objective || '');
        setSkills(Array.isArray(parsedData.skills) ? parsedData.skills : []);
        
        // Map parsed education
        const parsedEdu = Array.isArray(parsedData.education) ? parsedData.education.map((e: any, i: number) => ({
          id: Date.now().toString() + i,
          degree: e.degree || '',
          department: '',
          university: e.university || '',
          start_year: e.start_year || '',
          end_year: e.end_year || ''
        })) : [];
        setEducations(parsedEdu);

        // Map parsed experience
        const parsedExp = Array.isArray(parsedData.experience) ? parsedData.experience.map((e: any, i: number) => ({
          id: Date.now().toString() + i + 100,
          role: e.role || '',
          company: e.company || '',
          start_date: e.start_date || '',
          end_date: e.end_date || '',
          description: e.description || ''
        })) : [];
        setExperiences(parsedExp);

        // Map parsed projects
        const parsedProj = Array.isArray(parsedData.projects) ? parsedData.projects.map((e: any, i: number) => ({
          id: Date.now().toString() + i + 200,
          title: e.title || '',
          description: e.description || '',
          technologies: e.technologies || ''
        })) : [];
        setProjects(parsedProj);
      } else if (data.resume) {
        // Load from existing resume
        setObjective(data.resume.career_objective || '');
        
        // Handle skills (could be categorized JSON or simple string in profile)
        if (data.resume.skills_categorized) {
          try {
             const skillStr = data.resume.skills_categorized;
             const parsedSkills = typeof skillStr === 'string' ? JSON.parse(skillStr) : skillStr;
             // Check if it's the object format { technical: [...] } or array [...]
             if (Array.isArray(parsedSkills)) {
               setSkills(parsedSkills);
             } else if (parsedSkills && parsedSkills.technical) {
               setSkills(parsedSkills.technical || []);
             }
          } catch (e) {
             console.error("Error parsing skills:", e);
             setSkills([]);
          }
        } else if (data.skills) {
          setSkills(data.skills.split(',').map(s => s.trim()).filter(Boolean));
        }

        setEducations(parseJson(data.resume.education_entries, []).map((e: any) => ({
          id: e.id || Date.now().toString(),
          degree: e.degree || '',
          department: e.department || '',
          university: e.university || '',
          start_year: e.start_year || '',
          end_year: e.end_year || ''
        })));
        setExperiences(parseJson(data.resume.work_experience, []).map((e: any) => ({
          id: e.id || Date.now().toString(),
          role: e.role || '',
          company: e.company || '',
          start_date: e.start_date || '',
          end_date: e.end_date || '',
          description: e.description || ''
        })));
        setProjects(parseJson(data.resume.projects, []).map((e: any) => ({
          id: e.id || Date.now().toString(),
          title: e.title || '',
          description: e.description || '',
          technologies: e.technologies || ''
        })));
        
      } else {
        // Pre-fill from profile if no resume exists
        if (data.skills) {
          setSkills(data.skills.split(',').map(s => s.trim()).filter(Boolean));
        }
        if (data.university_name) {
             setEducations([{
                 id: Date.now().toString(),
                 degree: data.degree || "Degree",
                 department: data.department || "Department",
                 university: data.university_name,
                 start_year: data.start_year?.toString() || "",
                 end_year: data.end_year?.toString() || ""
             }]);
        }
      }
    } catch (error) {
      console.error('Failed to load profile', error);
      showError("Failed to load resume data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resumeData = {
        career_objective: objective,
        skills_categorized: JSON.stringify({ technical: skills }),
        education_entries: JSON.stringify(educations),
        work_experience: JSON.stringify(experiences),
        projects: JSON.stringify(projects),
      };
      
      await updateResume(resumeData);
      success("Resume saved successfully!");
    } catch (error) {
      console.error('Failed to save resume', error);
      showError("Failed to save resume");
    } finally {
      setSaving(false);
    }
  };

  const handleGetSuggestions = async (section: string) => {
    setLoadingSuggestion(section);
    setSuggestions(null);
    try {
      let currentContent = '';
      if (section === 'career_objective') currentContent = objective;
      else if (section === 'skills') currentContent = skills.join(', ');
      
      const context = {
        stream: profile?.department || '',
        course: profile?.degree || '',
        skills: skills.join(', '),
      };

      const response = await getResumeSuggestions(section, currentContent, context);
      setSuggestions({ section, items: Array.isArray(response.suggestions) ? response.suggestions : [] });
    } catch (error) {
      console.error('Failed to get suggestions', error);
      showError("Failed to get AI suggestions");
    } finally {
      setLoadingSuggestion(null);
    }
  };

  const applySuggestion = (text: string, section: string) => {
    if (section === 'career_objective') {
      setObjective(text);
    } else if (section === 'skills') {
      if (!skills.includes(text)) {
        setSkills([...skills, text]);
      }
    } else if (section === 'projects') {
        const newProject: Project = {
            id: Date.now().toString(),
            title: text.split(':')[0] || "New Project",
            description: text.includes(':') ? text.split(':')[1] : text,
            technologies: ""
        };
        setProjects([...projects, newProject]);
    } else if (section === 'work_experience') {
         const newExp: Experience = {
            id: Date.now().toString(),
            role: text,
            company: "Company Name",
            start_date: "",
            end_date: "",
            description: "Description of the role..."
        };
        setExperiences([...experiences, newExp]);
    }
    // Remove suggestion after applying? No, user might want multiple.
  };

  // Section Helpers
  const addEducation = () => setEducations([...educations, { id: Date.now().toString(), degree: '', department: '', university: '', start_year: '', end_year: '' }]);
  const updateEducation = (id: string, field: keyof Education, value: string) => setEducations(educations.map(e => e.id === id ? { ...e, [field]: value } : e));
  const removeEducation = (id: string) => setEducations(educations.filter(e => e.id !== id));

  const addExperience = () => setExperiences([...experiences, { id: Date.now().toString(), role: '', company: '', start_date: '', end_date: '', description: '' }]);
  const updateExperience = (id: string, field: keyof Experience, value: string) => setExperiences(experiences.map(e => e.id === id ? { ...e, [field]: value } : e));
  const removeExperience = (id: string) => setExperiences(experiences.filter(e => e.id !== id));

  const addProject = () => setProjects([...projects, { id: Date.now().toString(), title: '', description: '', technologies: '' }]);
  const updateProject = (id: string, field: keyof Project, value: string) => setProjects(projects.map(p => p.id === id ? { ...p, [field]: value } : p));
  const removeProject = (id: string) => setProjects(projects.filter(p => p.id !== id));


  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      {/* Header / Personal Info */}
      <div className="mb-10">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              {profile?.full_name || user?.full_name} 
              <button className="text-slate-400 hover:text-brand-600 transition-colors ml-2">
                <Edit2 size={18} />
              </button>
            </h1>
            <div className="space-y-1 text-slate-600">
              <p className="text-sm">{profile?.email || user?.email}</p>
              <p className="text-sm">{profile?.phone || "+91 9149101875"}</p>
              <p className="text-sm">{profile?.current_city || "Haridwar"}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.docx,.doc"
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isParsing} 
              className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              title="Upload existing resume to parse"
            >
              {isParsing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600"></div> : <Upload size={18} />}
              Upload
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={18} />}
                Save Resume
            </button>
            <button className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                <Download size={18} /> Download PDF
            </button>
          </div>
        </div>
        <hr className="mt-8 border-slate-200" />
      </div>

      {/* AI Suggestions Panel */}
      {suggestions && (
        <div className="mb-8 bg-sky-50 border border-sky-100 rounded-xl p-6 relative animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-2 rounded-full text-orange-500 mt-1">
              <Lightbulb size={24} fill="currentColor" className="text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900 mb-2">Suggestions for {suggestions.section.replace('_', ' ')}</h3>
              <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                Transform your experience into impressive achievements. Click on a suggestion to add it to your resume.
              </p>
              
              <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800 mb-2 text-sm">Recommended for {profile?.department || "your profile"}</h4>
                  <ul className="space-y-2">
                    {suggestions.items.map((item, idx) => (
                      <li key={idx} 
                          onClick={() => applySuggestion(item, suggestions.section)}
                          className="flex items-start gap-2 text-slate-700 text-sm hover:bg-white p-3 rounded-lg cursor-pointer transition-all border border-transparent hover:border-brand-100 hover:shadow-sm group">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-brand-500 block shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
              </div>
            </div>
            <button onClick={() => setSuggestions(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
          </div>
        </div>
      )}

      {/* Career Objective */}
      <div className="mb-8 group/section">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase flex items-center gap-2">
            <User size={16} /> Career Objective
          </h2>
          <button 
               onClick={() => handleGetSuggestions('career_objective')}
               disabled={!!loadingSuggestion}
               className="text-xs font-medium text-brand-600 hover:bg-brand-50 px-2 py-1 rounded transition-colors flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity"
          >
            {loadingSuggestion === 'career_objective' ? <span className="animate-spin">⌛</span> : <Sparkles size={12} />}
            AI Enhance
          </button>
        </div>
        
        <textarea 
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Write a career objective..."
            className="w-full p-3 text-sm text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none min-h-[100px]"
        />
      </div>

      {/* Education */}
      <div className="mb-8 group/section">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase flex items-center gap-2">
                <GraduationCap size={16} /> Education
            </h2>
        </div>
        
        <div className="space-y-4">
            {educations.map((edu) => (
                <div key={edu.id} className="border border-slate-200 rounded-lg p-4 bg-white relative group">
                    <button onClick={() => removeEducation(edu.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" value={edu.university} onChange={(e) => updateEducation(edu.id, 'university', e.target.value)} placeholder="University/School Name" className="font-bold text-slate-900 text-sm border-b border-transparent focus:border-brand-500 outline-none w-full" />
                        <div className="flex gap-2">
                             <input type="text" value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} placeholder="Degree" className="text-slate-700 text-sm border-b border-transparent focus:border-brand-500 outline-none w-full" />
                             <input type="text" value={edu.department} onChange={(e) => updateEducation(edu.id, 'department', e.target.value)} placeholder="Stream/Dept" className="text-slate-700 text-sm border-b border-transparent focus:border-brand-500 outline-none w-full" />
                        </div>
                        <div className="flex gap-2 text-xs text-slate-500">
                             <input type="text" value={edu.start_year} onChange={(e) => updateEducation(edu.id, 'start_year', e.target.value)} placeholder="Start Year" className="w-20 border-b border-transparent focus:border-brand-500 outline-none" />
                             <span>-</span>
                             <input type="text" value={edu.end_year} onChange={(e) => updateEducation(edu.id, 'end_year', e.target.value)} placeholder="End Year" className="w-20 border-b border-transparent focus:border-brand-500 outline-none" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
        
        <button onClick={addEducation} className="mt-4 flex items-center gap-2 text-brand-600 text-sm font-medium hover:underline">
          <Plus size={16} /> Add education
        </button>
      </div>

      {/* Work Experience */}
      <div className="mb-8 group/section">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase flex items-center gap-2">
            <Briefcase size={16} /> Work Experience
          </h2>
          <button 
             onClick={() => handleGetSuggestions('work_experience')}
             disabled={!!loadingSuggestion}
             className="text-xs font-medium text-brand-600 hover:bg-brand-50 px-2 py-1 rounded transition-colors flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity"
          >
            {loadingSuggestion === 'work_experience' ? <span className="animate-spin">⌛</span> : <Sparkles size={12} />}
            AI Suggestions
          </button>
        </div>

        <div className="space-y-4">
            {experiences.map((exp) => (
                <div key={exp.id} className="border border-slate-200 rounded-lg p-4 bg-white relative group">
                    <button onClick={() => removeExperience(exp.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <input type="text" value={exp.role} onChange={(e) => updateExperience(exp.id, 'role', e.target.value)} placeholder="Job Role / Title" className="font-bold text-slate-900 text-sm border-b border-transparent focus:border-brand-500 outline-none w-full" />
                            <input type="text" value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} placeholder="Company Name" className="text-right text-slate-700 text-sm border-b border-transparent focus:border-brand-500 outline-none w-1/2" />
                        </div>
                         <div className="flex gap-2 text-xs text-slate-500">
                             <input type="text" value={exp.start_date} onChange={(e) => updateExperience(exp.id, 'start_date', e.target.value)} placeholder="Start Date" className="w-24 border-b border-transparent focus:border-brand-500 outline-none" />
                             <span>-</span>
                             <input type="text" value={exp.end_date} onChange={(e) => updateExperience(exp.id, 'end_date', e.target.value)} placeholder="End Date" className="w-24 border-b border-transparent focus:border-brand-500 outline-none" />
                        </div>
                        <textarea value={exp.description} onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} placeholder="Description of responsibilities..." className="w-full text-sm text-slate-600 border border-slate-100 rounded p-2 focus:ring-1 focus:ring-brand-500 outline-none" rows={3} />
                    </div>
                </div>
            ))}
        </div>

        <div className="flex gap-6 mt-4">
            <button onClick={addExperience} className="flex items-center gap-2 text-brand-600 text-sm font-medium hover:underline">
                <Plus size={16} /> Add experience
            </button>
        </div>
      </div>

      {/* Projects */}
      <div className="mb-8 group/section">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase flex items-center gap-2">
            <Code size={16} /> Projects
          </h2>
          <button 
             onClick={() => handleGetSuggestions('projects')}
             disabled={!!loadingSuggestion}
             className="text-xs font-medium text-brand-600 hover:bg-brand-50 px-2 py-1 rounded transition-colors flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity"
          >
            {loadingSuggestion === 'projects' ? <span className="animate-spin">⌛</span> : <Sparkles size={12} />}
            AI Suggestions
          </button>
        </div>

        <div className="space-y-4">
            {projects.map((proj) => (
                <div key={proj.id} className="border border-slate-200 rounded-lg p-4 bg-white relative group">
                    <button onClick={() => removeProject(proj.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    <div className="space-y-2">
                         <input type="text" value={proj.title} onChange={(e) => updateProject(proj.id, 'title', e.target.value)} placeholder="Project Title" className="font-bold text-slate-900 text-sm border-b border-transparent focus:border-brand-500 outline-none w-full" />
                         <textarea value={proj.description} onChange={(e) => updateProject(proj.id, 'description', e.target.value)} placeholder="Project Description..." className="w-full text-sm text-slate-600 border border-slate-100 rounded p-2 focus:ring-1 focus:ring-brand-500 outline-none" rows={2} />
                         <input type="text" value={proj.technologies} onChange={(e) => updateProject(proj.id, 'technologies', e.target.value)} placeholder="Technologies used (e.g. React, Python)" className="text-xs text-slate-500 border-b border-transparent focus:border-brand-500 outline-none w-full" />
                    </div>
                </div>
            ))}
        </div>

        <button onClick={addProject} className="flex items-center gap-2 text-brand-600 text-sm font-medium hover:underline mt-4">
            <Plus size={16} /> Add project
        </button>
      </div>

      {/* Skills */}
      <div className="mb-8 group/section">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase flex items-center gap-2">
            <Award size={16} /> Skills
          </h2>
          <button 
             onClick={() => handleGetSuggestions('skills')}
             disabled={!!loadingSuggestion}
             className="text-xs font-medium text-brand-600 hover:bg-brand-50 px-2 py-1 rounded transition-colors flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity"
          >
             {loadingSuggestion === 'skills' ? <span className="animate-spin">⌛</span> : <Sparkles size={12} />}
             AI Suggestions
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {skills.map((skill, idx) => (
            <div key={idx} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 group hover:bg-slate-200 transition-colors border border-slate-200">
              {skill}
              <button onClick={() => setSkills(skills.filter(s => s !== skill))} className="text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button>
            </div>
          ))}
          <button onClick={() => {
              const newSkill = prompt("Enter skill:");
              if(newSkill) setSkills([...skills, newSkill]);
          }} className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 border border-dashed border-slate-300 text-slate-500 hover:text-brand-600 hover:border-brand-600 transition-colors">
              <Plus size={14} /> Add
          </button>
        </div>
      </div>

    </div>
  );
}