import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, MapPin, Phone, Mail, Plus, Edit2, Trash2, 
  Sparkles, Download, Save, ChevronDown, ChevronUp,
  Briefcase, GraduationCap, Code, Award, FileText, Lightbulb,
  X, Check, Upload, ArrowLeft
} from 'lucide-react';
import { getProfile, getResumeSuggestions, StudentProfile, getSkills, updateResume, StudentResume, parseResume } from '../services/students';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ResumePreview, Education, Experience, Project, Certification, ExtraCurricular } from './ResumePreview';

interface Suggestion {
  section: string;
  items: string[];
}

export function ResumeBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [extraCurricular, setExtraCurricular] = useState<ExtraCurricular[]>([]);
  
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
        setCertifications(parseJson(data.resume.certifications, []).map((e: any) => ({
          id: e.id || Date.now().toString(),
          name: e.name || '',
          issuer: e.issuer || '',
          year: e.year || ''
        })));
        setExtraCurricular(parseJson(data.resume.extra_curricular, []).map((e: any) => ({
          id: e.id || Date.now().toString(),
          activity: e.activity || '',
          description: e.description || ''
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
        certifications: JSON.stringify(certifications),
        extra_curricular: JSON.stringify(extraCurricular),
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

  const addCertification = () => setCertifications([...certifications, { id: Date.now().toString(), name: '', issuer: '', year: '' }]);
  const updateCertification = (id: string, field: keyof Certification, value: string) => setCertifications(certifications.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeCertification = (id: string) => setCertifications(certifications.filter(c => c.id !== id));

  const addExtraCurricular = () => setExtraCurricular([...extraCurricular, { id: Date.now().toString(), activity: '', description: '' }]);
  const updateExtraCurricular = (id: string, field: keyof ExtraCurricular, value: string) => setExtraCurricular(extraCurricular.map(e => e.id === id ? { ...e, [field]: value } : e));
  const removeExtraCurricular = (id: string) => setExtraCurricular(extraCurricular.filter(e => e.id !== id));

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium animate-pulse">Designing your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 font-sans bg-slate-50/30">
      {/* Premium Header Section */}
      <div className="relative mb-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/student/setup')}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 group"
            >
               <ArrowLeft size={24} className="group-hover:text-slate-900" />
            </button>
            <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Professional Resume Builder</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Create a job-winning resume in minutes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 group"
            >
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={16} />}
                Save Changes
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-3 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-black text-sm hover:bg-slate-50 transition-all"
            >
                <Download size={16} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Editor (Scrollable) */}
        <div className="space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto pr-4 custom-scrollbar">
          
          {/* Section: Professional Summary */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={16} className="text-brand-500" />
                Professional Summary
              </h2>
              <button 
                onClick={() => handleGetSuggestions('career_objective')}
                className="text-[10px] font-black text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-brand-100 transition-colors"
              >
                AI Suggestions
              </button>
            </div>
            <textarea 
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Describe your professional journey and what makes you unique..."
              className="w-full text-sm text-slate-600 bg-slate-50/50 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all outline-none leading-relaxed placeholder:text-slate-300 min-h-[120px]"
            />
          </section>

          {/* Section: Experience */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={16} className="text-brand-500" />
                Experience
              </h2>
              <button onClick={addExperience} className="p-2 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-colors">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-6">
              {experiences.map((exp) => (
                <div key={exp.id} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative group">
                  <button onClick={() => removeExperience(exp.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input type="text" value={exp.role} onChange={(e) => updateExperience(exp.id, 'role', e.target.value)} placeholder="Role/Title" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-100" />
                    <input type="text" value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} placeholder="Company" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-100" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input type="text" value={exp.start_date} onChange={(e) => updateExperience(exp.id, 'start_date', e.target.value)} placeholder="Start Date (e.g. Jan 2023)" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-100" />
                    <input type="text" value={exp.end_date} onChange={(e) => updateExperience(exp.id, 'end_date', e.target.value)} placeholder="End Date (e.g. Present)" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-100" />
                  </div>
                  <textarea value={exp.description} onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} placeholder="Responsibilities and achievements..." className="w-full text-xs text-slate-600 bg-white border border-slate-100 rounded-xl p-4 outline-none focus:ring-2 focus:ring-brand-100 leading-relaxed" rows={3} />
                </div>
              ))}
            </div>
          </section>

          {/* Section: Education */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <GraduationCap size={16} className="text-brand-500" />
                Education
              </h2>
              <button onClick={addEducation} className="p-2 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-colors">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-6">
              {educations.map((edu) => (
                <div key={edu.id} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative">
                  <button onClick={() => removeEducation(edu.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input type="text" value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} placeholder="Degree" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-100" />
                    <input type="text" value={edu.university} onChange={(e) => updateEducation(edu.id, 'university', e.target.value)} placeholder="University" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-100" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={edu.start_year} onChange={(e) => updateEducation(edu.id, 'start_year', e.target.value)} placeholder="Start Year" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-100" />
                    <input type="text" value={edu.end_year} onChange={(e) => updateEducation(edu.id, 'end_year', e.target.value)} placeholder="End Year/Passing" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-100" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Projects */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Code size={16} className="text-brand-500" />
                Projects
              </h2>
              <button onClick={addProject} className="p-2 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-colors">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-6">
              {projects.map((proj) => (
                <div key={proj.id} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative">
                  <button onClick={() => removeProject(proj.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <input type="text" value={proj.title} onChange={(e) => updateProject(proj.id, 'title', e.target.value)} placeholder="Project Title" className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-100 mb-4" />
                  <textarea value={proj.description} onChange={(e) => updateProject(proj.id, 'description', e.target.value)} placeholder="Project description..." className="w-full text-xs text-slate-600 bg-white border border-slate-100 rounded-xl p-4 outline-none focus:ring-2 focus:ring-brand-100 leading-relaxed mb-4" rows={2} />
                  <input type="text" value={proj.technologies} onChange={(e) => updateProject(proj.id, 'technologies', e.target.value)} placeholder="Technologies used (e.g. React, Node.js)" className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-100" />
                </div>
              ))}
            </div>
          </section>

          {/* Section: Certifications */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Award size={16} className="text-brand-500" />
                Certifications
              </h2>
              <button onClick={addCertification} className="p-2 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-colors">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-6">
              {certifications.map((cert) => (
                <div key={cert.id} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative">
                  <button onClick={() => removeCertification(cert.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" value={cert.name} onChange={(e) => updateCertification(cert.id, 'name', e.target.value)} placeholder="Certification Name" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-100" />
                    <input type="text" value={cert.issuer} onChange={(e) => updateCertification(cert.id, 'issuer', e.target.value)} placeholder="Issuer" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-100" />
                    <input type="text" value={cert.year} onChange={(e) => updateCertification(cert.id, 'year', e.target.value)} placeholder="Year" className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-100" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Extra-Curricular */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={16} className="text-brand-500" />
                Extra-Curricular
              </h2>
              <button onClick={addExtraCurricular} className="p-2 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-colors">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-6">
              {extraCurricular.map((extra) => (
                <div key={extra.id} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative">
                  <button onClick={() => removeExtraCurricular(extra.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <input type="text" value={extra.activity} onChange={(e) => updateExtraCurricular(extra.id, 'activity', e.target.value)} placeholder="Activity Name (e.g. Volunteer, Club Lead)" className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-100 mb-4" />
                  <textarea value={extra.description} onChange={(e) => updateExtraCurricular(extra.id, 'description', e.target.value)} placeholder="Describe your role..." className="w-full text-xs text-slate-600 bg-white border border-slate-100 rounded-xl p-4 outline-none focus:ring-2 focus:ring-brand-100 leading-relaxed" rows={2} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Live Preview (A4 Paper Style) */}
        <div className="sticky top-24 hidden lg:block print:hidden">
          <div className="flex items-center justify-between mb-4 px-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Preview</p>
            <div className="flex gap-2">
               <div className="w-3 h-3 rounded-full bg-red-400"></div>
               <div className="w-3 h-3 rounded-full bg-amber-400"></div>
               <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            </div>
          </div>
          
          <ResumePreview 
            data={{
              full_name: profile?.full_name || user?.full_name || undefined,
              email: profile?.email || user?.email || undefined,
              phone: profile?.phone || "+91 9149101875",
              current_city: profile?.current_city || "Haridwar",
              objective,
              skills,
              educations,
              experiences,
              projects,
              certifications,
              extraCurricular
            }}
          />
        </div>

        {/* Print Only Version */}
        <div className="hidden print:block">
          <ResumePreview 
            isPrintMode={true}
            data={{
              full_name: profile?.full_name || user?.full_name || undefined,
              email: profile?.email || user?.email || undefined,
              phone: profile?.phone || "+91 9149101875",
              current_city: profile?.current_city || "Haridwar",
              objective,
              skills,
              educations,
              experiences,
              projects,
              certifications,
              extraCurricular
            }}
          />
        </div>
      </div>
      
      {/* AI Suggestions Modal/Drawer */}
      {suggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-brand-50/30">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center gap-3">
                <Sparkles size={20} className="text-brand-500" />
                AI Suggestions
              </h3>
              <button onClick={() => setSuggestions(null)} className="p-2 hover:bg-white rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {suggestions.items.map((item, i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all cursor-pointer group" onClick={() => applySuggestion(item, suggestions.section)}>
                   <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900">{item}</p>
                   <div className="mt-3 flex justify-end">
                      <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Apply Now +</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loadingSuggestion && (
        <div className="fixed bottom-12 right-12 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500"></div>
          <span className="text-xs font-black uppercase tracking-widest">AI is thinking...</span>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}