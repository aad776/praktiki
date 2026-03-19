import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import { 
  User, MapPin, Phone, Mail, Plus, Edit2, Trash2, 
  Sparkles, Download, Save, ChevronDown, ChevronUp,
  Briefcase, GraduationCap, Code, Award, FileText, Lightbulb,
  X, Check, Upload, Camera, Target, Globe, Rocket, ChevronRight
} from 'lucide-react';
import { ResumeBuilder } from "../components/ResumeBuilder";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api, { ApiError } from "../services/api";
import { COLLEGES, STREAMS, STREAM_SKILLS_MAPPING, LANGUAGES } from "../data/profileData";

// --- Reusable Components ---

const Autocomplete = ({
  label,
  options = [],
  value,
  onChange,
  onManualEnter,
  placeholder,
  endpoint,
  queryParams = {},
  required = false,
  noLabel = false,
  minimal = false
}: {
  label?: string,
  options?: string[],
  value: string,
  onChange: (val: string) => void,
  onManualEnter?: (val: string) => void,
  placeholder: string,
  endpoint?: string,
  queryParams?: Record<string, string>,
  required?: boolean,
  noLabel?: boolean,
  minimal?: boolean
}) => {
  const [show, setShow] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal state with prop value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!endpoint) return;

      setLoading(true);
      try {
        const response: any = await api.get(endpoint, { 
          params: { q: inputValue || '', ...queryParams } 
        });
        // Correct response handling
        const names = Array.isArray(response) ? response.map((item: any) => item.name) : [];
        setFiltered(names);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (endpoint) {
      const timeoutId = setTimeout(() => {
        // Fetch if show is true OR if queryParams exist (dependent fields)
        // OR if inputValue changes (real-time search)
        fetchSuggestions();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      if (inputValue) {
        const lower = inputValue.toLowerCase();
        setFiltered(options.filter(o => o.toLowerCase().includes(lower)));
      } else {
        setFiltered(options);
      }
    }
  }, [inputValue, options, endpoint, show, JSON.stringify(queryParams)]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (onManualEnter) {
        onManualEnter(inputValue.trim());
        setInputValue("");
        setShow(false);
      } else {
        onChange(inputValue.trim());
        setShow(false);
      }
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {!noLabel && label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            // Don't call onChange immediately for skills to prevent "a", "t" behavior
            if (!onManualEnter) {
              onChange(e.target.value);
            }
            setShow(true);
          }}
          onFocus={() => setShow(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={minimal
            ? "bg-transparent border-none p-0 focus:ring-0 font-medium w-full"
            : "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
          }
        />
        {loading && (
          <div className={`absolute ${minimal ? 'right-0' : 'right-3'} top-1/2 -translate-y-1/2`}>
            <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      {show && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[200px]">
          {filtered.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {filtered.map((opt, i) => (
                <li
                  key={i}
                  onClick={() => {
                    onChange(opt);
                    setShow(false);
                  }}
                  className="px-4 py-2 hover:bg-brand-50 cursor-pointer text-sm text-gray-700"
                >
                  {opt}
                </li>
              ))}
            </ul>
          ) : !loading && inputValue.length > 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center italic">
              No results found. Feel free to type yours.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const YearPicker = ({
  label,
  value,
  onChange,
  required = false,
  maxYear
}: {
  label: string,
  value: string,
  onChange: (val: string) => void,
  required?: boolean,
  maxYear?: number
}) => {
  // A simple dropdown is actually cleaner than a full calendar for just "Year"
  // But user asked for "proper calendar like date choose", so let's make a grid UI
  const [show, setShow] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const startYearLimit = 1980;
  const endYearLimit = maxYear || (currentYear + 6); // Future years for graduation
  const years = Array.from({ length: endYearLimit - startYearLimit + 1 }, (_, i) => endYearLimit - i); // Descending

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        onClick={() => setShow(!show)}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white cursor-pointer flex justify-between items-center"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value || "YYYY"}
        </span>
        <span className="text-gray-400">📅</span>
      </div>

      {show && (
        <div className="absolute z-20 w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-2">
          <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
            {years.map(year => (
              <button
                key={year}
                onClick={() => {
                  onChange(String(year));
                  setShow(false);
                }}
                className={`p-2 text-sm rounded hover:bg-brand-100 ${value === String(year) ? "bg-brand-500 text-white hover:bg-brand-600" : "text-gray-700"
                  }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Step Components defined OUTSIDE to prevent re-renders ---

const Step1 = ({ formData, handleChange, toggleSelection, user }: any) => (
  <div className="space-y-6 animate-fadeIn">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-800">Hi there! 👋</h2>
      <p className="text-xl font-semibold text-gray-700">Let's get started</p>
      <p className="text-sm text-gray-500 mt-2">* All fields are mandatory</p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">First name <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="first_name"
          value={formData.first_name}
          onChange={handleChange}
          placeholder="Aditya"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Last name <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="last_name"
          value={formData.last_name}
          onChange={handleChange}
          placeholder="Yadav"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
      <input
        type="email"
        value={user?.email || "No email found"}
        disabled
        className="w-full px-4 py-2 bg-gray-100 border rounded-lg text-gray-500 cursor-not-allowed"
      />
      <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Contact number <span className="text-red-500">*</span></label>
      <div className="flex">
        <span className="inline-flex items-center px-4 py-2 border border-r-0 rounded-l-lg bg-white text-gray-500">+91</span>
        <input
          type="tel"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          placeholder="Mobile number"
          maxLength={10}
          className="w-full px-4 py-2 border rounded-r-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Current city <span className="text-red-500">*</span></label>
      <p className="text-xs text-gray-500 mb-2">To connect you with opportunities closer to you</p>
      <input
        type="text"
        name="current_city"
        value={formData.current_city}
        onChange={handleChange}
        placeholder="Current location"
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">APAAR ID (ABC ID)</label>
      <p className="text-xs text-gray-500 mb-2">
        12-digit APAAR ID is required to apply for internships.
        <a href="https://apaar.education.gov.in" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline ml-1">
          Get your APAAR ID
        </a>
      </p>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
        </div>
        <input
          type="text"
          name="apaar_id"
          value={formData.apaar_id || ""}
          onChange={(e) => handleChange({ target: { name: 'apaar_id', value: e.target.value.replace(/\D/g, '').slice(0, 12) } } as any)}
          placeholder="123456789012"
          maxLength={12}
          className="w-full px-4 py-2 pl-12 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>
      {formData.apaar_id && formData.apaar_id.length !== 12 && (
        <p className="text-xs text-amber-600 mt-1">APAAR ID must be exactly 12 digits</p>
      )}
      {formData.apaar_id && formData.apaar_id.length === 12 && (
        <p className="text-xs text-green-600 mt-1">✓ Valid APAAR ID format</p>
      )}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Gender <span className="text-red-500">*</span></label>
      <div className="flex gap-4">
        {["Female", "Male", "Others"].map(g => (
          <button
            key={g}
            type="button"
            onClick={() => handleChange({ target: { name: "gender", value: g } } as any)}
            className={`px-6 py-2 rounded-full border transition-colors ${formData.gender === g
              ? "bg-brand-50 border-brand-500 text-brand-600 font-medium"
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {g}
          </button>
        ))}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Languages you know <span className="text-red-500">*</span></label>
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            type="button"
            onClick={() => toggleSelection("languages", lang)}
            className={`px-4 py-1 rounded-full border text-sm transition-colors ${formData.languages.includes(lang)
              ? "bg-brand-50 border-brand-500 text-brand-600"
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {lang} {formData.languages.includes(lang) ? "✓" : "+"}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const Step2 = ({ formData, handleChange, setFormData }: any) => (
  <div className="space-y-6 animate-fadeIn">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-800">Education details 🎓</h2>
      <p className="text-sm text-gray-500 mt-2">* All fields are mandatory</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Type <span className="text-red-500">*</span></label>
      <div className="flex flex-wrap gap-2">
        {["College student", "Fresher", "Working professional", "School student", "Woman returning to work"].map(type => (
          <button
            key={type}
            type="button"
            onClick={() => handleChange({ target: { name: "profile_type", value: type } } as any)}
            className={`px-4 py-2 rounded-full border text-sm transition-colors ${formData.profile_type === type
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>

    <Autocomplete
      label="Course"
      placeholder="Eg. B.Tech"
      endpoint="/autocomplete/courses"
      value={formData.course}
      onChange={(val) => {
        handleChange({ target: { name: "course", value: val } } as any);
        // Clear dependent fields when course changes
        setFormData((prev: any) => ({ ...prev, stream: "", specialization: "" }));
      }}
      required
    />

    <Autocomplete
      label="College name"
      placeholder="Search for your college"
      endpoint="/autocomplete/colleges"
      value={formData.college_name}
      onChange={(val) => handleChange({ target: { name: "college_name", value: val } } as any)}
      required
    />

    <Autocomplete
      label="Stream"
      placeholder="Eg. Engineering"
      endpoint="/autocomplete/streams"
      queryParams={{ course_name: formData.course }}
      value={formData.stream}
      onChange={(val) => {
        handleChange({ target: { name: "stream", value: val } } as any);
        // Clear dependent fields when stream changes
        setFormData((prev: any) => ({ ...prev, specialization: "" }));
      }}
      required
    />

    <Autocomplete
      label="Specialization"
      placeholder="Eg. Computer Science"
      endpoint="/autocomplete/specializations"
      queryParams={{ stream_name: formData.stream }}
      value={formData.specialization}
      onChange={(val) => {
        handleChange({ target: { name: "specialization", value: val } } as any);
      }}
      required
    />

    <div className="grid grid-cols-2 gap-4">
      <YearPicker
        label="Start year"
        value={formData.start_year}
        onChange={(val) => handleChange({ target: { name: "start_year", value: val } } as any)}
        required
        maxYear={new Date().getFullYear()}
      />
      <YearPicker
        label="End year"
        value={formData.end_year}
        onChange={(val) => handleChange({ target: { name: "end_year", value: val } } as any)}
        required
        maxYear={new Date().getFullYear() + 6}
      />
    </div>
  </div>
);

const Step3 = ({ formData, toggleSelection, handleNext, loading, error, suggestedSkills, navigate }: any) => (
  <div className="space-y-6 animate-fadeIn">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-800">Your preferences 🎯</h2>
      <p className="text-gray-600">Help us match you with the best career opportunities</p>
      <p className="text-sm text-gray-500 mt-2">* All fields are mandatory</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Area(s) of interest <span className="text-red-500">*</span></label>

      <div className="mb-4">
        <Autocomplete
          placeholder="Search for interests (e.g. Web Development)"
          endpoint="/autocomplete/areas-of-interest"
          queryParams={{
            course_name: formData.course,
            stream_name: formData.stream
          }}
          value=""
          onChange={(val) => {
            if (val && !formData.interests.includes(val)) {
              toggleSelection("interests", val);
            }
          }}
          onManualEnter={(val) => {
            if (val && !formData.interests.includes(val)) {
              toggleSelection("interests", val);
            }
          }}
          noLabel
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {formData.interests.map((interest: string) => (
          <span
            key={interest}
            className="inline-flex items-center px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-sm"
          >
            {interest}
            <button
              type="button"
              onClick={() => toggleSelection("interests", interest)}
              className="ml-2 text-brand-500 hover:text-brand-700"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Suggested Skills based on Stream */}
      {suggestedSkills.length > 0 && (
        <div className="mb-4 p-3 bg-brand-50 rounded-lg border border-brand-100">
          <p className="text-xs font-semibold text-brand-700 mb-2">Suggested for your stream ({formData.specialization}):</p>
          <div className="flex flex-wrap gap-2">
            {suggestedSkills.map((skill: string) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSelection("interests", skill)}
                className={`px-3 py-1 rounded-full text-xs transition-colors border ${formData.interests.includes(skill)
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-brand-700 border-brand-200 hover:bg-brand-100"
                  }`}
              >
                {skill} {formData.interests.includes(skill) ? "✓" : "+"}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mb-2">General Interests:</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {["Software Development", "Web Development", "Data Science", "Marketing", "Content Writing", "Teaching", "Sales", "Engineering Design", "Finance", "HR"].map(interest => (
          <button
            key={interest}
            type="button"
            onClick={() => toggleSelection("interests", interest)}
            className={`px-4 py-1 rounded-full border text-sm transition-colors ${formData.interests.includes(interest)
              ? "bg-brand-50 border-brand-500 text-brand-600"
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {interest} {formData.interests.includes(interest) ? "✓" : "+"}
          </button>
        ))}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Currently looking for <span className="text-red-500">*</span></label>
      <div className="flex gap-4">
        {["Jobs", "Internships"].map(type => (
          <button
            key={type}
            type="button"
            onClick={() => toggleSelection("looking_for", type)}
            className={`px-6 py-2 rounded-full border transition-colors ${formData.looking_for.includes(type)
              ? "bg-brand-50 border-brand-500 text-brand-600 font-medium"
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {type} {formData.looking_for.includes(type) ? "✓" : "+"}
          </button>
        ))}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Work mode <span className="text-red-500">*</span></label>
      <div className="flex gap-4">
        {["In-office", "Work from home"].map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => toggleSelection("work_mode", mode)}
            className={`px-6 py-2 rounded-full border transition-colors ${formData.work_mode.includes(mode)
              ? "bg-brand-50 border-brand-500 text-brand-600 font-medium"
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {mode} {formData.work_mode.includes(mode) ? "✓" : "+"}
          </button>
        ))}
      </div>
    </div>

    <div className="flex justify-end pt-8">
      <button
        onClick={() => navigate('/resume-maker')}
        className="px-8 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium transition-colors"
      >
        {formData.resume.resume_file_path ? "View/Edit Resume" : "Create your resume"}
      </button>
    </div>
    {error && <p className="text-red-500 text-center mt-2">{error}</p>}
  </div>
);

const Step4 = ({ formData, setFormData, handleResumeUpload, handleSubmit, loading, error, user }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePicRef = useRef<HTMLInputElement>(null);
  const [showSummaryDetailed, setShowSummaryDetailed] = useState(false);
  const [activeLayout, setActiveLayout] = useState<'traditional' | 'creative'>('traditional');

  const updateResume = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      resume: { ...prev.resume, [field]: value }
    }));
  };

  const addListItem = (field: string, defaultValue: any) => {
    const current = formData.resume[field] || [];
    updateResume(field, [...current, defaultValue]);
  };

  const updateListItem = (field: string, index: number, updates: any) => {
    const current = [...(formData.resume[field] || [])];
    current[index] = { ...current[index], ...updates };
    updateResume(field, current);
  };

  const removeListItem = (field: string, index: number) => {
    const current = (formData.resume[field] || []).filter((_: any, i: number) => i !== index);
    updateResume(field, current);
  };

  const updateSkill = (category: string, index: number, updates: any) => {
    const skills = { ...formData.resume.skills_categorized };
    skills[category][index] = { ...skills[category][index], ...updates };
    updateResume('skills_categorized', skills);
  };

  const addSkill = (category: string) => {
    const skills = { ...formData.resume.skills_categorized };
    skills[category] = [...(skills[category] || []), { name: '', level: 50 }];
    updateResume('skills_categorized', skills);
  };

  return (
    <div className={`resume-template bg-white shadow-2xl mx-auto my-8 p-[0.75in] font-sans text-[#4A4A4A] leading-[1.15] max-w-[8.5in] min-h-[11in] border border-gray-200 transition-all duration-500 ${activeLayout === 'creative' ? 'creative-layout' : ''}`}
      style={{
        fontFamily: activeLayout === 'traditional' ? '"Garamond", serif' : '"Arial", sans-serif',
        fontSize: '11pt'
      }}>

      {/* Header Section */}
      <header className="mb-[0.5in] flex justify-between items-start border-b-2 border-[#D9E3F0] pb-4">
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-[22pt] font-bold text-[#2B3A55] uppercase tracking-wide mb-1">
              <input
                className="bg-transparent border-none focus:ring-0 w-full p-0 font-bold"
                value={`${formData.first_name} ${formData.last_name}`}
                onChange={(e) => {
                  const [f, ...l] = e.target.value.split(' ');
                  setFormData((prev: any) => ({ ...prev, first_name: f, last_name: l.join(' ') }));
                }}
              />
            </h1>

            <div className="no-print flex items-center gap-3">
              {formData.resume.resume_file_path && (
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/students/resume/download/${formData.resume.resume_file_path.split('/').pop()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Uploaded Resume
                </a>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="px-4 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-bold hover:bg-brand-600 transition-all flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {formData.resume.resume_file_path ? "Replace Resume" : "Upload Resume"}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
              />
            </div>
          </div>
          <div className="text-[14pt] text-[#4A4A4A] italic mb-4">
            <input
              className="bg-transparent border-none focus:ring-0 w-full p-0 italic"
              placeholder="Professional Title (e.g. Full Stack Developer)"
              value={formData.resume.title || ''}
              onChange={(e) => updateResume('title', e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-[10pt] text-gray-600">
            <span className="flex items-center gap-1">📞 {formData.phone_number}</span>
            <span className="flex items-center gap-1">📧 {user?.email}</span>
            <span className="flex items-center gap-1">📍 {formData.current_city}</span>
            <div className="flex items-center gap-2">
              <input
                className="bg-transparent border-b border-gray-200 focus:border-blue-500 focus:outline-none w-40 p-0"
                placeholder="LinkedIn URL"
                value={formData.resume.linkedin || ''}
                onChange={(e) => updateResume('linkedin', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="relative group ml-8">
          <div className="w-32 h-32 rounded-lg bg-[#D9E3F0] overflow-hidden border-2 border-[#2B3A55] flex items-center justify-center">
            {formData.resume.profile_picture ? (
              <img src={formData.resume.profile_picture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl text-[#2B3A55]">👤</span>
            )}
          </div>
          <button
            onClick={() => profilePicRef.current?.click()}
            className="absolute -bottom-2 -right-2 bg-[#2B3A55] text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            +
          </button>
          <input
            type="file"
            ref={profilePicRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => updateResume('profile_picture', ev.target?.result);
                reader.readAsDataURL(e.target.files[0]);
              }
            }}
          />
        </div>
      </header>

      {/* Summary Section */}
      <section className="mb-[0.5in]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14pt] font-bold text-[#2B3A55] border-l-4 border-[#2B3A55] pl-3 uppercase tracking-wider">Professional Summary</h2>
          <button
            onClick={() => setShowSummaryDetailed(!showSummaryDetailed)}
            className="text-[#2B3A55] text-xl font-bold hover:scale-110 transition-transform"
          >
            {showSummaryDetailed ? '−' : '+'}
          </button>
        </div>
        <div className="relative group">
          <textarea
            className={`w-full bg-transparent border-none focus:ring-0 p-0 text-[11pt] resize-none overflow-hidden transition-all duration-300 ${showSummaryDetailed ? 'h-32' : 'h-16'}`}
            placeholder="Brief professional summary highlighting your key qualifications..."
            value={formData.resume.career_objective}
            onChange={(e) => updateResume('career_objective', e.target.value)}
          />
        </div>
      </section>

      {/* Work Experience Section */}
      <section className="mb-[0.5in]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14pt] font-bold text-[#2B3A55] border-l-4 border-[#2B3A55] pl-3 uppercase tracking-wider">Work Experience</h2>
          <button
            onClick={() => addListItem('work_experience', { company: '', position: '', duration: '', achievements: [''], attachments: [] })}
            className="bg-[#2B3A55] text-white w-6 h-6 rounded-full flex items-center justify-center text-lg shadow-md hover:bg-[#3E5073]"
          >
            +
          </button>
        </div>

        <div className="space-y-6">
          {(formData.resume.work_experience || []).map((exp: any, idx: number) => (
            <div key={idx} className="relative group border-l border-gray-100 pl-6 pb-2">
              <button
                onClick={() => removeListItem('work_experience', idx)}
                className="absolute -left-3 top-0 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              <div className="flex justify-between items-baseline mb-1">
                <input
                  className="font-bold text-[#2B3A55] text-[12pt] bg-transparent border-none p-0 focus:ring-0 w-2/3"
                  placeholder="Company Name"
                  value={exp.company}
                  onChange={(e) => updateListItem('work_experience', idx, { company: e.target.value })}
                />
                <input
                  className="text-[10pt] text-right bg-transparent border-none p-0 focus:ring-0 w-1/3 italic"
                  placeholder="Jan 2020 – Present"
                  value={exp.duration}
                  onChange={(e) => updateListItem('work_experience', idx, { duration: e.target.value })}
                />
              </div>
              <div className="mb-2">
                <input
                  className="italic text-[#4A4A4A] text-[11pt] bg-transparent border-none p-0 focus:ring-0 w-full"
                  placeholder="Position Title"
                  value={exp.position}
                  onChange={(e) => updateListItem('work_experience', idx, { position: e.target.value })}
                />
              </div>
              <ul className="list-none space-y-1">
                {(exp.achievements || []).map((ach: string, aIdx: number) => (
                  <li key={aIdx} className="flex gap-2 items-start text-[10.5pt] pl-[0.25in]">
                    <span className="text-[#2B3A55] mt-1">•</span>
                    <textarea
                      className="flex-1 bg-transparent border-none p-0 focus:ring-0 resize-none h-6"
                      placeholder="Key achievement or responsibility..."
                      value={ach}
                      onChange={(e) => {
                        const newAch = [...exp.achievements];
                        newAch[aIdx] = e.target.value;
                        updateListItem('work_experience', idx, { achievements: newAch });
                      }}
                    />
                    {aIdx === exp.achievements.length - 1 && (
                      <button
                        onClick={() => {
                          const newAch = [...exp.achievements, ''];
                          updateListItem('work_experience', idx, { achievements: newAch });
                        }}
                        className="text-gray-300 hover:text-[#2B3A55] opacity-0 group-hover:opacity-100"
                      >
                        +
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Education Section */}
      <section className="mb-[0.5in]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14pt] font-bold text-[#2B3A55] border-l-4 border-[#2B3A55] pl-3 uppercase tracking-wider">Education</h2>
          <button
            onClick={() => addListItem('education_entries', { degree: '', institution: '', year: '', details: '' })}
            className="bg-[#2B3A55] text-white w-6 h-6 rounded-full flex items-center justify-center text-lg shadow-md hover:bg-[#3E5073]"
          >
            +
          </button>
        </div>

        <div className="space-y-4">
          {/* Pre-filled from Step 2 */}
          <div className="relative group border-l border-gray-100 pl-6 pb-2">
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-bold text-[#2B3A55] text-[12pt]">{formData.course} in {formData.specialization}</span>
              <span className="text-[10pt] text-right italic">{formData.start_year} – {formData.end_year}</span>
            </div>
            <div className="text-[#4A4A4A] text-[11pt]">{formData.college_name}</div>
          </div>

          {(formData.resume.education_entries || []).map((edu: any, idx: number) => (
            <div key={idx} className="relative group border-l border-gray-100 pl-6 pb-2">
              <button
                onClick={() => removeListItem('education_entries', idx)}
                className="absolute -left-3 top-0 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              <div className="flex justify-between items-baseline mb-1">
                <input
                  className="font-bold text-[#2B3A55] text-[12pt] bg-transparent border-none p-0 focus:ring-0 w-2/3"
                  placeholder="Degree / Certification"
                  value={edu.degree}
                  onChange={(e) => updateListItem('education_entries', idx, { degree: e.target.value })}
                />
                <input
                  className="text-[10pt] text-right bg-transparent border-none p-0 focus:ring-0 w-1/3 italic"
                  placeholder="Graduation Year"
                  value={edu.year}
                  onChange={(e) => updateListItem('education_entries', idx, { year: e.target.value })}
                />
              </div>
              <input
                className="text-[#4A4A4A] text-[11pt] bg-transparent border-none p-0 focus:ring-0 w-full"
                placeholder="Institution Name"
                value={edu.institution}
                onChange={(e) => updateListItem('education_entries', idx, { institution: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Skills Section */}
      <section className="mb-[0.5in]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14pt] font-bold text-[#2B3A55] border-l-4 border-[#2B3A55] pl-3 uppercase tracking-wider">Skills</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[0.5in]">
          {['technical', 'soft', 'languages'].map((cat) => (
            <div key={cat}>
              <div className="flex items-center justify-between mb-2 border-b border-[#D9E3F0] pb-1">
                <h3 className="text-[11pt] font-bold text-[#4A4A4A] capitalize">{cat} Skills</h3>
                <button
                  onClick={() => addSkill(cat)}
                  className="text-[#2B3A55] font-bold hover:scale-125"
                >
                  +
                </button>
              </div>
              <div className="space-y-3">
                {(formData.resume.skills_categorized?.[cat] || []).map((skill: any, idx: number) => (
                  <div key={idx} className="group relative">
                    <div className="flex justify-between text-[10pt] mb-1">
                      <div className="w-2/3">
                        <Autocomplete
                          value={skill.name}
                          onChange={(val) => updateSkill(cat, idx, { name: val })}
                          placeholder="Skill Name"
                          endpoint="/autocomplete/skills"
                          label=""
                          noLabel
                        />
                      </div>
                      <span className="text-gray-400 opacity-0 group-hover:opacity-100">{skill.level}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#D9E3F0] rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-[#2B3A55] transition-all duration-500"
                        style={{ width: `${skill.level}%` }}
                      />
                      <input
                        type="range"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        value={skill.level}
                        onChange={(e) => updateSkill(cat, idx, { level: parseInt(e.target.value) })}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const s = { ...formData.resume.skills_categorized };
                        s[cat] = s[cat].filter((_: any, i: number) => i !== idx);
                        updateResume('skills_categorized', s);
                      }}
                      className="absolute -left-5 top-0 text-red-400 opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Controls Overlay (Not part of print) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-gray-200 rounded-full px-6 py-3 shadow-2xl flex items-center gap-6 z-50 no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase">Layout</span>
          <button
            onClick={() => setActiveLayout('traditional')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeLayout === 'traditional' ? 'bg-[#2B3A55] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Traditional
          </button>
          <button
            onClick={() => setActiveLayout('creative')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeLayout === 'creative' ? 'bg-[#2B3A55] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Creative
          </button>
        </div>

        <div className="h-6 w-[1px] bg-gray-200" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase">Length</span>
          <div className="flex items-center gap-1">
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: '65%' }} />
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">Optimal</span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-gray-200" />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-[#2B3A55] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg hover:bg-[#3E5073] active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Find me opportunities →'}
        </button>
      </div>

      <style>{`
            @media print {
                .no-print { display: none !important; }
                body { background: white !important; }
                .resume-template { 
                    box-shadow: none !important; 
                    margin: 0 !important; 
                    border: none !important;
                }
            }
            .resume-template input::placeholder, 
            .resume-template textarea::placeholder {
                color: #CBD5E1;
                font-style: italic;
            }
            .creative-layout {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 0.5in;
            }
            .creative-layout header {
                grid-column: 1 / -1;
            }
            .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f1f1;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #2B3A55;
                border-radius: 10px;
            }
        `}</style>
    </div>
  );
};

// --- Profile View Component (Card-based Interface) ---

const ProfileView = ({ formData, onEdit, onLogout, handleResumeUpload, user }: { 
  formData: any, 
  onEdit: (step: number) => void, 
  onLogout: () => void,
  handleResumeUpload: (e: any) => void, 
  user: any 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [certUploading, setCertUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  const toast = useToast();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        await handleResumeUpload(e);
      } finally {
        setUploading(false);
      }
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const onCertChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCertUploading(true);
      const file = e.target.files[0];
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      try {
        const response: any = await api.post("/certificates/upload", formDataUpload);
        
        if (response.verification_data) {
          toast.success("Certificate uploaded & verified! Submitted to Institute.");
        } else {
          toast.info("Certificate uploaded. Manual verification pending.");
        }
      } catch (error) {
        console.error("Certificate upload failed:", error);
        toast.error("Failed to upload certificate.");
      } finally {
        setCertUploading(false);
      }
    }
  };

  const calculateCompletion = () => {
    let total = 0;
    if (formData.first_name && formData.last_name) total += 10;
    if (formData.phone_number) total += 10;
    if (formData.current_city) total += 5;
    if (formData.course) total += 15;
    if (formData.specialization) total += 10;
    if (formData.college_name) total += 10;
    if (formData.resume?.resume_file_path) total += 20;
    if (formData.resume?.skills_categorized?.technical?.length > 0) total += 10;
    if (formData.languages?.length > 0) total += 10;
    return Math.min(total, 100);
  };

  const completion = calculateCompletion();

  return (
    <div className="container-wide py-8 animate-fadeIn bg-[#f8fafc]">
      {/* Upload Resume Hidden Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept=".pdf,.doc,.docx"
        className="hidden"
      />

      <input
        type="file"
        ref={certInputRef}
        onChange={onCertChange}
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
      />

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden mb-8 relative">
        <div className="p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Profile Photo with Progress Ring */}
          <div className="relative flex-shrink-0">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="74"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="74"
                  stroke="#14b8a6"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 74}
                  strokeDashoffset={2 * Math.PI * 74 * (1 - completion / 100)}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-2 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border-4 border-white shadow-inner group">
                {formData.resume?.profile_picture ? (
                  <img src={formData.resume.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors">
                    <User size={48} strokeWidth={1.5} />
                    <span className="text-[10px] font-bold mt-1 uppercase">Add Photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md border border-slate-100">
                <span className="text-xs font-black text-brand-600">{completion}%</span>
              </div>
            </div>
          </div>

          {/* User Basic Info */}
          <div className="flex-grow text-center md:text-left pt-4">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {formData.first_name} {formData.last_name}
              </h1>
              <button onClick={() => onEdit(1)} className="text-slate-400 hover:text-brand-500 transition-colors">
                <Edit2 size={18} />
              </button>
            </div>
            
            <p className="text-lg font-bold text-slate-600 mb-1">{formData.course}</p>
            <p className="text-sm font-medium text-slate-500 mb-6">{formData.college_name}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 max-w-2xl">
              <div className="flex items-center gap-2.5 text-slate-500">
                <MapPin size={16} className="text-brand-500" />
                <span className="text-sm font-semibold">{formData.current_city || "City not set"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-500">
                <Phone size={16} className="text-brand-500" />
                <span className="text-sm font-semibold">{formData.phone_number || "Add phone"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-500">
                <User size={16} className="text-brand-500" />
                <span className="text-sm font-semibold capitalize">{formData.gender || "Add gender"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-500">
                <Mail size={16} className="text-brand-500" />
                <span className="text-sm font-semibold truncate">{user?.email || "Email not found"}</span>
              </div>
            </div>
          </div>

          {/* Profile Completion Box */}
          <div className="w-full md:w-80 bg-brand-50/50 rounded-2xl p-6 border border-brand-100">
            <div className="space-y-4 mb-6">
              {[
                { label: 'Add details', bonus: '8%', done: !!formData.current_city },
                { label: 'Add skills', bonus: '10%', done: formData.resume?.skills_categorized?.technical?.length > 0 },
                { label: 'Upload resume', bonus: '20%', done: !!formData.resume?.resume_file_path },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${item.done ? 'bg-brand-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                      {item.done ? <Check size={14} strokeWidth={3} /> : i + 1}
                    </div>
                    <span className={`text-xs font-bold ${item.done ? 'text-slate-400 line-through' : 'text-slate-600'}`}>{item.label}</span>
                  </div>
                  {!item.done && <span className="text-[10px] font-black text-brand-600 bg-white px-2 py-0.5 rounded border border-brand-100">↑ {item.bonus}</span>}
                </div>
              ))}
            </div>
            <button 
              onClick={() => onEdit(1)}
              className="w-full py-3 bg-brand-500 text-white rounded-xl text-sm font-black shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all active:scale-[0.98]"
            >
              Update Profile
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {/* Prominent Upload Resume Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`px-6 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 shadow-md transition-all flex items-center gap-2 ${uploading ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
        >
          {uploading ? (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <Upload size={18} />
          )}
          {uploading ? 'Uploading...' : 'Upload Resume'}
        </button>

        {/* Verify Certificate Button */}
        <button
          onClick={() => certInputRef.current?.click()}
          disabled={certUploading}
          className={`px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2 ${certUploading ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
        >
          {certUploading ? (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )}
          {certUploading ? 'Verifying...' : 'Verify Certificate'}
        </button>

        {formData.resume?.resume_file_path && (
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/students/resume/download/${formData.resume.resume_file_path.split('/').pop()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Resume
          </a>
        )}

        <button
          onClick={onLogout}
          className="px-6 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-semibold hover:bg-red-100 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>

        <button
          onClick={() => onEdit(1)}
          className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Profile
        </button>

        <Link
          to="/resume-maker"
          className="px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:scale-105 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Enhance Resume
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-8 border-b border-slate-200 mb-8">
        <button 
          onClick={() => setActiveTab('view')}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'view' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          View & Edit
          {activeTab === 'view' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-500 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('insights')}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'insights' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Activity insights
          {activeTab === 'insights' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-500 rounded-t-full" />}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {activeTab === 'view' ? (
          <>
            {/* Left Sidebar: Quick Links */}
            <div className="lg:w-1/4">
              <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 sticky top-24">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Quick links</h3>
                <div className="space-y-1">
                  {[
                    { label: 'Preferences', id: 'preferences', icon: Target },
                    { label: 'Education', id: 'education', icon: GraduationCap },
                    { label: 'Key skills', id: 'skills', icon: Award },
                    { label: 'Languages', id: 'languages', icon: Globe },
                    { label: 'Internships', id: 'experience', icon: Briefcase },
                    { label: 'Projects', id: 'projects', icon: Rocket },
                    { label: 'Resume', id: 'resume', icon: FileText },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} className="text-slate-400 group-hover:text-brand-500" />
                        {item.label}
                      </div>
                      <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="lg:w-3/4 space-y-8">
              {/* Career Preferences Section */}
              <section id="preferences" className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
                        <Target size={20} />
                      </div>
                      Career Preferences
                    </h3>
                    <button onClick={() => onEdit(3)} className="text-brand-600 text-sm font-black uppercase tracking-widest hover:text-brand-700">Edit</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Preferred job type</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.looking_for?.length > 0 ? formData.looking_for.map((item: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-100">{item}</span>
                        )) : <button onClick={() => onEdit(3)} className="text-brand-600 text-xs font-bold hover:underline">Add desired job type</button>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Availability to work</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.work_mode?.length > 0 ? formData.work_mode.map((item: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-100">{item}</span>
                        )) : <button onClick={() => onEdit(3)} className="text-brand-600 text-xs font-bold hover:underline">Add work availability</button>}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.interests?.length > 0 ? formData.interests.map((item: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-xs font-bold border border-brand-100">{item}</span>
                        )) : <button onClick={() => onEdit(3)} className="text-brand-600 text-xs font-bold hover:underline">Add interests</button>}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Education Section */}
              <section id="education" className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                        <GraduationCap size={20} />
                      </div>
                      Education
                    </h3>
                    <button onClick={() => onEdit(2)} className="text-brand-600 text-sm font-black uppercase tracking-widest hover:text-brand-700">Add</button>
                  </div>
                  <div className="space-y-8">
                    {/* Primary Education */}
                    <div className="relative pl-8 border-l-2 border-slate-100 group">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-brand-500 shadow-glow" />
                      <p className="text-lg font-black text-slate-900 mb-1 leading-tight">{formData.course}</p>
                      <p className="text-sm font-bold text-slate-500 mb-2">{formData.college_name}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">{formData.start_year} - {formData.end_year}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Time</span>
                      </div>
                    </div>
                    
                    {/* Additional Education Entries */}
                    {formData.resume?.education_entries?.map((edu: any, i: number) => (
                      <div key={i} className="relative pl-8 border-l-2 border-slate-100 group">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-slate-300 group-hover:border-brand-400 transition-colors" />
                        <p className="text-lg font-black text-slate-900 mb-1 leading-tight">{edu.degree}</p>
                        <p className="text-sm font-bold text-slate-500 mb-2">{edu.institution}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">Graduated in {edu.year}</span>
                        </div>
                      </div>
                    ))}

                    {!formData.resume?.education_entries?.length && (
                      <div className="py-4 space-y-4">
                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => onEdit(2)}>
                          <div>
                            <p className="text-sm font-black text-brand-600 hover:underline">Add Class XII Details</p>
                            <p className="text-xs text-slate-400">Scored Percentage, Passed out in Passing Year</p>
                          </div>
                          <Plus size={16} className="text-slate-300" />
                        </div>
                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => onEdit(2)}>
                          <div>
                            <p className="text-sm font-black text-brand-600 hover:underline">Add Class X Details</p>
                            <p className="text-xs text-slate-400">Scored Percentage, Passed out in Passing Year</p>
                          </div>
                          <Plus size={16} className="text-slate-300" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Key Skills Section */}
              <section id="skills" className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center">
                        <Award size={20} />
                      </div>
                      Key skills
                    </h3>
                    <button onClick={() => onEdit(4)} className="text-brand-600 text-sm font-black uppercase tracking-widest hover:text-brand-700">Edit</button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.values(formData.resume?.skills_categorized || {}).flat().length > 0 ? 
                      Object.values(formData.resume?.skills_categorized || {}).flat().map((skill: any, i: number) => (
                        <span key={i} className="px-5 py-2.5 bg-slate-50 text-slate-700 rounded-2xl text-xs font-black border border-slate-100 hover:bg-brand-500 hover:text-white hover:border-brand-500 transition-all cursor-default shadow-sm">
                          {skill.name}
                        </span>
                      )) : (
                      <p className="text-sm text-slate-400 font-medium">Add your skills to stand out to employers.</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Languages Section */}
              <section id="languages" className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                        <Globe size={20} />
                      </div>
                      Languages
                    </h3>
                    <button onClick={() => onEdit(1)} className="text-brand-600 text-sm font-black uppercase tracking-widest hover:text-brand-700">Edit</button>
                  </div>
                  {formData.languages?.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {formData.languages.map((lang: string, i: number) => (
                        <span key={i} className="px-5 py-2.5 bg-indigo-50/50 text-indigo-700 rounded-2xl text-xs font-black border border-indigo-100">
                          {lang}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 font-medium">Talk about the languages that you can speak, read or write</p>
                  )}
                </div>
              </section>

              {/* Internships/Experience Section */}
              <section id="experience" className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                        <Briefcase size={20} />
                      </div>
                      Internships
                    </h3>
                    <button onClick={() => onEdit(4)} className="text-brand-600 text-sm font-black uppercase tracking-widest hover:text-brand-700">Add</button>
                  </div>
                  {formData.resume?.work_experience?.length > 0 ? (
                    <div className="space-y-10">
                      {formData.resume.work_experience.map((exp: any, i: number) => (
                        <div key={i} className="flex gap-6 group">
                          <div className="flex-grow">
                            <p className="text-lg font-black text-slate-900 mb-1">{exp.position}</p>
                            <p className="text-sm font-black text-brand-600 uppercase tracking-widest mb-3">{exp.company}</p>
                            <p className="text-xs text-slate-500 font-bold mb-4">{exp.duration}</p>
                            <ul className="space-y-2">
                              {exp.achievements?.map((ach: string, j: number) => (
                                <li key={j} className="text-sm text-slate-600 flex gap-3">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0" />
                                  {ach}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 font-medium italic">Share your professional journey</p>
                  )}
                </div>
              </section>

              {/* Projects Section */}
              <section id="projects" className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <Rocket size={20} />
                      </div>
                      Projects
                    </h3>
                    <button onClick={() => onEdit(4)} className="text-brand-600 text-sm font-black uppercase tracking-widest hover:text-brand-700">Add</button>
                  </div>
                  {formData.resume?.projects?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {formData.resume.projects.map((proj: any, i: number) => (
                        <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-brand-200 transition-all">
                          <p className="text-base font-black text-slate-900 mb-1">{proj.title}</p>
                          <p className="text-xs text-slate-500 font-bold mb-3">{proj.duration}</p>
                          <p className="text-sm text-slate-600 line-clamp-3">{proj.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 font-medium">Highlight your best work and technical projects</p>
                  )}
                </div>
              </section>

              {/* Resume Section */}
              <section id="resume" className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                        <FileText size={20} />
                      </div>
                      Resume
                    </h3>
                    <button onClick={() => onEdit(4)} className="text-brand-600 text-sm font-black uppercase tracking-widest hover:text-brand-700">Update</button>
                  </div>
                  
                  <p className="text-sm text-slate-500 font-medium mb-8">
                    Your resume is the first impression you make on potential employers. Craft it carefully to secure your desired job or internship.
                  </p>

                  <div className="relative group mb-8">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30 hover:bg-brand-50/30 hover:border-brand-300 transition-all cursor-pointer">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 text-brand-500">
                          <Upload size={24} />
                        </div>
                        <p className="text-sm font-black text-brand-600">Upload resume</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Supported formats: doc, docx, rtf, pdf, up to 2MB</p>
                      </div>
                      <input type="file" className="hidden" onChange={handleResumeUpload} accept=".pdf,.doc,.docx" />
                    </label>
                  </div>

                  <div className="flex items-center gap-6 p-6 rounded-3xl bg-blue-50/50 border border-blue-100">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-500 flex-shrink-0">
                      <FileText size={32} />
                    </div>
                    <div className="flex-grow">
                      <p className="text-base font-black text-slate-900 mb-1">Don't have a resume yet?</p>
                      <p className="text-xs text-slate-500 font-bold">Create a job-winning resume with our simple resume builder</p>
                    </div>
                    <Link to="/resume-maker" className="text-sm font-black text-brand-600 hover:underline">Create resume</Link>
                  </div>

                  {formData.resume?.resume_file_path && (
                    <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                          <Check size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Resume uploaded successfully</p>
                          <p className="text-xs text-slate-400 font-bold">Last updated: {formData.resume.resume_uploaded_at ? new Date(formData.resume.resume_uploaded_at).toLocaleDateString() : 'Recently'}</p>
                        </div>
                      </div>
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/students/resume/download/${formData.resume.resume_file_path.split('/').pop()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                      >
                        <Download size={14} />
                        Download CV
                      </a>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="flex-grow bg-white rounded-3xl shadow-soft border border-slate-100 p-12 text-center">
            <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Sparkles size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Activity Insights</h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">Detailed tracking of your application performance and profile views will appear here soon.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
              {[
                { label: 'Profile Views', value: '0' },
                { label: 'Search Appearances', value: '0' },
                { label: 'Applications', value: formData.resume?.applications?.length || '0' },
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-2xl font-black text-slate-900 mb-1">{stat.value}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



export function StudentProfileSetup() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [isViewMode, setIsViewMode] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Form State
  const [formData, setFormData] = useState({
    // Step 1
    first_name: "",
    last_name: "",
    phone_number: "",
    current_city: "",
    gender: "",
    languages: [] as string[],
    apaar_id: "", // APAAR ID for students

    // Step 2
    profile_type: "",
    course: "",
    stream: "", // Stream (e.g. Engineering)
    specialization: "", // Specialization (e.g. Computer Science)
    college_name: "",
    start_year: "",
    end_year: "",

    // Step 3
    interests: [] as string[],
    looking_for: [] as string[],
    work_mode: [] as string[],

    // Step 4 - Resume
    resume: {
      career_objective: "",
      work_experience: [] as any[], // Array of { company, position, duration, achievements, attachments }
      projects: [] as any[],
      certifications: [] as any[],
      extra_curricular: [] as any[],
      skills_categorized: {
        technical: [] as any[],
        soft: [] as any[],
        languages: [] as any[]
      },
      profile_picture: null as string | null,
      education_entries: [] as any[]
    } as any
  });

  const hasPreFilled = useRef(false);

  // Main Effect to load data (either from API or from parsed resume)
  useEffect(() => {
    // Check if we have parsedData from navigation
    if (location.state?.parsedData && !hasPreFilled.current) {
      const { parsedData } = location.state;
      console.log("Handling pre-filled data from resume:", parsedData);
      
      fetchData(parsedData);
      
      hasPreFilled.current = true;
      toast.success("We've pre-filled some details from your resume. Please review and complete the rest.");
      
      // Clear the state so it doesn't re-trigger on refresh/back
      navigate(location.pathname + location.search, { replace: true, state: {} });
    } else if (!hasPreFilled.current) {
      // Normal fetch only if not already pre-filled
      fetchData();
    }
  }, [location.state, toast, navigate, location.pathname, location.search]);

   // Watch for Stream changes to update Suggested Skills
   useEffect(() => {
     if (formData.specialization && STREAM_SKILLS_MAPPING[formData.specialization]) {
       setSuggestedSkills(STREAM_SKILLS_MAPPING[formData.specialization]);
     } else {
       setSuggestedSkills([]);
     }
   }, [formData.specialization]);

   // Automatically update resume fields based on profile details
   useEffect(() => {
     // Combine interests and suggested skills for technical skills
     const allSkills = new Set<string>();

     // Add selected interests
     formData.interests.forEach(interest => {
       allSkills.add(interest);
     });

     // Add suggested skills based on specialization
     suggestedSkills.forEach(skill => {
       allSkills.add(skill);
     });

     // Map to resume skills format
     const technicalSkills = Array.from(allSkills).map(skill => ({
       name: skill,
       level: 60 // Default proficiency level for technical skills
     }));

     // Map selected languages to resume language skills
     const languageSkills = formData.languages.map(lang => ({
       name: lang,
       level: 70 // Default proficiency level for languages
     }));

     // Generate career objective based on profile details
     const careerObjective = formData.specialization && formData.profile_type
       ? `Motivated ${formData.profile_type} with expertise in ${formData.specialization}, seeking opportunities in ${formData.interests[0] || 'the industry'} to apply my skills and contribute to organizational success.`
       : '';

     // Generate professional title based on specialization
     const professionalTitle = formData.specialization
       ? `${formData.specialization} ${formData.profile_type || 'Professional'}`
       : '';

     setFormData(prev => ({
       ...prev,
       resume: {
         ...prev.resume,
         career_objective: prev.resume.career_objective || careerObjective,
         title: prev.resume.title || professionalTitle,
         skills_categorized: {
           ...prev.resume.skills_categorized,
           technical: technicalSkills,
           languages: languageSkills
         }
       }
     }));
   }, [formData.interests, suggestedSkills, formData.specialization, formData.profile_type, formData.languages]);

   const toggleSelection = (field: keyof typeof formData, value: string) => {
     setFormData(prev => {
       const current = prev[field] as string[];
       const updatedValues = current.includes(value)
         ? current.filter(item => item !== value)
         : [...current, value];

       return { ...prev, [field]: updatedValues };
     });
   };

   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
     const { name, value } = e.target;
     setFormData(prev => ({ ...prev, [name]: value }));
   };

   const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!(e.target.files && e.target.files[0])) return;

     const file = e.target.files[0];
     const MAX_SIZE = 5 * 1024 * 1024;
     if (file.size > MAX_SIZE) {
       toast.error("File too large. Maximum size allowed is 5MB.");
       return;
     }

     const allowedTypes = [
       'application/pdf',
       'application/msword',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
     ];
     if (!allowedTypes.includes(file.type)) {
       toast.error("Invalid file format. Please upload PDF, DOC, or DOCX.");
       return;
     }

     const formDataUpload = new FormData();
     formDataUpload.append("file", file);

     try {
       setLoading(true);

       // 1) Parse + auto-fill (primary requirement)
       // Backend parser route currently supports PDF for parsing.
       const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
       if (isPdf) {
         const parseResponse: any = await api.post("/students/me/parse-resume", formDataUpload);
         if (parseResponse?.success && parseResponse?.data) {
           await fetchData(parseResponse.data); // merge only known profile-form fields
           setIsViewMode(false);                // bring user to editable form
           setStep(1);
           toast.success("Resume parsed and profile fields auto-filled. Please review and complete missing details.");
         } else {
           toast.error("Resume uploaded but parsing failed. Please fill details manually.");
         }
       } else {
         toast.info("Auto-fill is currently available for PDF resumes. You can still fill details manually.");
       }

       // 2) Optional best-effort file upload if backend endpoint is present
       // (kept silent because some deployments may not expose this route)
       try {
         await api.post("/students/me/resume/upload", formDataUpload);
       } catch {
         // no-op
       }
     } catch (err) {
       const error = err as ApiError;
       toast.error(error.message || "Failed to process resume.");
     } finally {
       setLoading(false);
       if (e.target) e.target.value = "";
     }
   };

   const validateStep = (currentStep: number) => {
     setError(null);
     if (currentStep === 1) {
       if (!formData.first_name || !formData.last_name || !formData.phone_number || !formData.current_city || !formData.gender || formData.languages.length === 0) {
         setError("Please fill all mandatory fields to proceed.");
         return false;
       }
     } else if (currentStep === 2) {
       if (!formData.profile_type || !formData.course || !formData.college_name || !formData.specialization || !formData.start_year || !formData.end_year) {
         setError("Please fill all mandatory fields to proceed.");
         return false;
       }
       if (parseInt(formData.start_year) >= parseInt(formData.end_year)) {
         setError("Start year must be before the end year.");
         return false;
       }
     } else if (currentStep === 3) {
       if (!formData.interests.length || !formData.looking_for.length || !formData.work_mode.length) {
         setError("Please select at least one option for each preference.");
         return false;
       }
     }
     return true;
   };

   const handleNext = () => {
     if (validateStep(step)) {
       if (step === 3) {
         navigate('/resume-maker');
       } else {
         setStep(prev => prev + 1);
       }
       setError(null);
     }
   };

   const handleBack = () => {
     setStep(prev => prev - 1);
     setError(null);
   };

   const handleEdit = (targetStep: number = 1) => {
     setIsViewMode(false);
     setStep(targetStep);
   };

   const fetchData = async (parsedDataOverride?: any) => {
    const parseList = (str: string | null) => str ? str.split(",").map(s => s.trim()).filter(Boolean) : [];
    const parseJSON = (val: any, fallback: any) => {
      if (!val) return fallback;
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch {
        return fallback;
      }
    };
    const normalizeParsedEducation = (rawEducation: any): any[] => {
      if (!Array.isArray(rawEducation)) return [];
      return rawEducation.map((edu: any) => {
        const yearText = String(edu?.year || "");
        const yearMatches = yearText.match(/\b(19|20)\d{2}\b/g) || [];
        const derivedStartYear = edu?.start_year
          ? String(edu.start_year)
          : (yearMatches.length > 1 ? yearMatches[0] : "");
        const derivedEndYear = edu?.end_year
          ? String(edu.end_year)
          : (yearMatches.length > 0 ? yearMatches[yearMatches.length - 1] : "");

        return {
          degree: edu?.degree || "",
          institution: edu?.institution || edu?.university || "",
          year: edu?.year || (derivedStartYear && derivedEndYear ? `${derivedStartYear}-${derivedEndYear}` : ""),
          gpa: edu?.gpa || "",
          field_of_study: edu?.field_of_study || edu?.specialization || "",
          start_year: derivedStartYear,
          end_year: derivedEndYear,
        };
      });
    };

    try {
      setInitialLoading(true);
      // Fetch Profile
      let profileData: any = null;
      try {
        console.log("Fetching student profile...");
        const profileRes = await api.get<Record<string, any>>("/students/me");
        profileData = profileRes;
      } catch (err) {
        console.log("No profile found or error fetching profile:", err);
      }

      // Fetch Resume
      let resumeData: any = null;
      try {
        const resumeRes = await api.get<Record<string, any>>("/students/me/resume");
        resumeData = resumeRes;
      } catch (err) {
        console.log("No resume found");
      }

      // If we have parsedDataOverride, we'll merge it later
      const dataToUse = parsedDataOverride || {};
      const parsedEducationEntries = normalizeParsedEducation(
        dataToUse.education_entries || dataToUse.education
      );
      const primaryParsedEducation = parsedEducationEntries[0] || null;
      const parsedStartYear = primaryParsedEducation?.start_year
        ? String(primaryParsedEducation.start_year)
        : "";
      const parsedEndYear = primaryParsedEducation?.end_year
        ? String(primaryParsedEducation.end_year)
        : "";

      setFormData(prev => {
        // Prepare updated fields
        const updatedFields: any = {
          ...prev,
          // 1. Profile fields (priority: Parsed > Fetched > Previous)
          first_name: dataToUse.first_name || (profileData ? profileData.first_name : prev.first_name) || "",
          last_name: dataToUse.last_name || (profileData ? profileData.last_name : prev.last_name) || "",
          phone_number: dataToUse.phone_number 
            ? dataToUse.phone_number.replace(/\D/g, '').slice(-10) // Clean to 10 digits
            : (profileData ? profileData.phone_number : prev.phone_number) || "",
          
          // 2. Fetch-only fields
          current_city: (profileData ? profileData.current_city : prev.current_city) || "",
          gender: (profileData ? profileData.gender : prev.gender) || "",
          languages: profileData ? parseList(profileData.languages) : prev.languages,
          apaar_id: (profileData ? profileData.apaar_id : prev.apaar_id) || "",
          profile_type: (profileData ? profileData.profile_type : prev.profile_type) || "",
          course: dataToUse.course
            || primaryParsedEducation?.degree
            || (profileData ? profileData.degree : prev.course)
            || "",
          specialization: dataToUse.specialization
            || primaryParsedEducation?.field_of_study
            || (profileData ? profileData.department : prev.specialization)
            || "",
          college_name: dataToUse.college_name
            || primaryParsedEducation?.institution
            || (profileData ? profileData.university_name : prev.college_name)
            || "",
          start_year: parsedStartYear
            || ((profileData && profileData.start_year) ? String(profileData.start_year) : prev.start_year),
          end_year: parsedEndYear
            || ((profileData && profileData.end_year) ? String(profileData.end_year) : prev.end_year),
          
          // 3. Interests (merge parsed skills into interests)
          interests: dataToUse.skills 
            ? [...new Set([...(profileData ? parseList(profileData.interests) : prev.interests), ...dataToUse.skills])]
            : (profileData ? parseList(profileData.interests) : prev.interests),
            
          looking_for: profileData ? parseList(profileData.looking_for) : prev.looking_for,
          work_mode: profileData ? parseList(profileData.work_mode) : prev.work_mode,
          
          // 4. Resume fields
          resume: {
            ...prev.resume,
            career_objective: dataToUse.career_objective
              || (resumeData ? resumeData.career_objective : prev.resume.career_objective)
              || "",
            work_experience: dataToUse.experience 
              ? dataToUse.experience.map((exp: any) => ({
                  company: exp.company || "",
                  position: exp.position || "",
                  duration: exp.duration || "",
                  achievements: exp.description ? [exp.description] : [""],
                  attachments: []
                }))
              : (resumeData ? parseJSON(resumeData.work_experience, []) : prev.resume.work_experience),
            
            projects: Array.isArray(dataToUse.projects)
              ? dataToUse.projects
              : (resumeData ? parseJSON(resumeData.projects, []) : prev.resume.projects),
            certifications: Array.isArray(dataToUse.certifications)
              ? dataToUse.certifications
              : (resumeData ? parseJSON(resumeData.certifications, []) : prev.resume.certifications),
            extra_curricular: resumeData ? parseJSON(resumeData.extra_curricular, []) : prev.resume.extra_curricular,
            education_entries: parsedEducationEntries.length > 0
              ? parsedEducationEntries
              : (resumeData ? parseJSON(resumeData.education_entries, []) : prev.resume.education_entries),
            
            skills_categorized: {
              ...prev.resume.skills_categorized,
              technical: dataToUse.skills 
                ? dataToUse.skills.map((s: string) => ({ name: s, level: 70 }))
                : (resumeData ? parseJSON(resumeData.skills_categorized, { technical: [], soft: [], languages: [] }).technical : prev.resume.skills_categorized.technical),
              soft: resumeData ? parseJSON(resumeData.skills_categorized, { technical: [], soft: [], languages: [] }).soft : prev.resume.skills_categorized.soft,
              languages: resumeData ? parseJSON(resumeData.skills_categorized, { technical: [], soft: [], languages: [] }).languages : prev.resume.skills_categorized.languages,
            },
            
            title: (resumeData ? resumeData.title : prev.resume.title) || "",
            linkedin: (resumeData ? resumeData.linkedin : prev.resume.linkedin) || "",
            resume_file_path: (resumeData ? resumeData.resume_file_path : prev.resume.resume_file_path) || null,
            resume_filename: (resumeData ? resumeData.resume_filename : prev.resume.resume_filename) || null,
            resume_file_size: (resumeData ? resumeData.resume_file_size : prev.resume.resume_file_size) || null,
            resume_uploaded_at: (resumeData ? resumeData.resume_uploaded_at : prev.resume.resume_uploaded_at) || null
          }
        };

        return updatedFields;
      });

      if (profileData) {
        // Check if edit mode is requested via URL params
        const isEditMode = searchParams.get("mode") === "edit" || !!parsedDataOverride;
        setIsViewMode(!isEditMode);
      } else {
        setIsViewMode(false);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Save Profile
      // Combine interests and suggested skills for the skills field
      const allSkills = new Set<string>();
      formData.interests.forEach(interest => allSkills.add(interest));
      suggestedSkills.forEach(skill => allSkills.add(skill));

      const profilePayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        current_city: formData.current_city,
        gender: formData.gender,
        languages: formData.languages.join(", "),
        apaar_id: formData.apaar_id || null,
        profile_type: formData.profile_type,
        university_name: formData.college_name,
        degree: formData.course,
        department: formData.specialization,
        start_year: parseInt(formData.start_year) || null,
        end_year: parseInt(formData.end_year) || null,
        skills: Array.from(allSkills).join(", "),
        interests: formData.interests.join(", "),
        looking_for: formData.looking_for.join(", "),
        work_mode: formData.work_mode.join(", ")
      };

      // Use the new upsert endpoint (POST /students/me)
      await api.post("/students/me", profilePayload);

      // 2. Save Resume
      const resumePayload = {
        career_objective: formData.resume.career_objective,
        work_experience: JSON.stringify(formData.resume.work_experience),
        projects: JSON.stringify(formData.resume.projects),
        certifications: JSON.stringify(formData.resume.certifications),
        extra_curricular: JSON.stringify(formData.resume.extra_curricular),
        education_entries: JSON.stringify(formData.resume.education_entries),
        skills_categorized: JSON.stringify(formData.resume.skills_categorized),
        title: formData.resume.title,
        linkedin: formData.resume.linkedin
      };

      try {
        await api.put("/students/me/resume", resumePayload);
      } catch {
        // Resume save failed but profile saved, continue
      }

      toast.success("Profile saved successfully!");
      setIsViewMode(true);
      fetchData(); // Refresh data to show latest
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || "Failed to save profile. Please try again.");
      setError(error.message || "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (isViewMode) {
    return (
      <div className="min-h-screen bg-slate-50" key="view-mode">
        <ProfileView
          formData={formData}
          onEdit={handleEdit}
          onLogout={handleLogout}
          handleResumeUpload={handleResumeUpload}
          user={user}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-12 px-2 sm:px-6 lg:px-8" key="form-mode">
      <div className={`${step === 4 ? 'max-w-[1100px]' : 'max-w-4xl'} w-full mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-8 transition-all duration-500`}>
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-1.5 rounded-full mb-8 overflow-hidden">
          <div
            className="bg-teal-500 h-full transition-all duration-300 ease-in-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <Step1
            formData={formData}
            handleChange={handleChange}
            toggleSelection={toggleSelection}
            user={user}
          />
        )}

        {step === 2 && (
          <Step2
            formData={formData}
            handleChange={handleChange}
            setFormData={setFormData}
          />
        )}

        {step === 3 && (
          <Step3
            formData={formData}
            toggleSelection={toggleSelection}
            handleNext={handleNext}
            loading={loading}
            error={error}
            suggestedSkills={suggestedSkills}
            navigate={navigate}
          />
        )}

        {step === 4 && (
          <Step4
            formData={formData}
            setFormData={setFormData}
            handleResumeUpload={handleResumeUpload}
            handleSubmit={handleSubmit}
            loading={loading}
            error={error}
            user={user}
          />
        )}

        {/* Navigation Buttons (Back/Next) - Centered or Split based on step */}
        {step < 3 && (
          <div className={`flex ${step === 1 ? 'justify-end' : 'justify-between'} pt-8`}>
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-8 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-8 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {error && step < 3 && <p className="text-red-500 text-center mt-2">{error}</p>}
      </div>
    </div>
  );
}
