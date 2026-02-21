import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
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
        const params = { q: inputValue, ...queryParams };
        const response: any = await api.get(endpoint, { params });
        // Response is array directly
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
        if (show || Object.keys(queryParams).length > 0) fetchSuggestions();
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
            : "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700"
                >
                  {opt}
                </li>
              ))}
            </ul>
          ) : !loading && value.length > 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center italic">
              No results found
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
  required = false
}: {
  label: string,
  value: string,
  onChange: (val: string) => void,
  required?: boolean
}) => {
  // A simple dropdown is actually cleaner than a full calendar for just "Year"
  // But user asked for "proper calendar like date choose", so let's make a grid UI
  const [show, setShow] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const startYear = 1980;
  const endYear = currentYear + 6; // Future years for graduation
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i); // Descending

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
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer flex justify-between items-center"
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
                className={`p-2 text-sm rounded hover:bg-blue-100 ${value === String(year) ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-700"
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
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
          className="w-full px-4 py-2 border rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>

    {/* APAAR ID input hidden as per requirements - moved to ABC Status Dashboard */}
    {/* <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">APAAR ID <span className="text-red-500">*</span></label>
      <p className="text-xs text-gray-500 mb-2">
        12-digit APAAR ID is required to apply for internships.
        <a href="https://apaar.education.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
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
          value={formData.apaar_id}
          onChange={(e) => handleChange({ target: { name: 'apaar_id', value: e.target.value.replace(/\D/g, '').slice(0, 12) } } as any)}
          placeholder="123456789012"
          maxLength={12}
          className="w-full px-4 py-2 pl-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      {formData.apaar_id && formData.apaar_id.length !== 12 && (
        <p className="text-xs text-amber-600 mt-1">APAAR ID must be exactly 12 digits</p>
      )}
      {formData.apaar_id && formData.apaar_id.length === 12 && (
        <p className="text-xs text-green-600 mt-1">✓ Valid APAAR ID format</p>
      )}
    </div> */}

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Gender <span className="text-red-500">*</span></label>
      <div className="flex gap-4">
        {["Female", "Male", "Others"].map(g => (
          <button
            key={g}
            type="button"
            onClick={() => handleChange({ target: { name: "gender", value: g } } as any)}
            className={`px-6 py-2 rounded-full border transition-colors ${formData.gender === g
              ? "bg-blue-50 border-blue-500 text-blue-600 font-medium"
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
              ? "bg-blue-50 border-blue-500 text-blue-600"
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
              ? "bg-blue-600 text-white border-blue-600"
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
      value={formData.stream}
      onChange={(val) => {
        handleChange({ target: { name: "stream", value: val } } as any);
      }}
      required
    />

    <Autocomplete
      label="Specialization"
      placeholder="Eg. Computer Science"
      endpoint="/autocomplete/specializations"
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
      />
      <YearPicker
        label="End year"
        value={formData.end_year}
        onChange={(val) => handleChange({ target: { name: "end_year", value: val } } as any)}
        required
      />
    </div>
  </div>
);

const Step3 = ({ formData, toggleSelection, handleNext, loading, error, suggestedSkills, handleChange }: any) => (
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
            className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm"
          >
            {interest}
            <button
              type="button"
              onClick={() => toggleSelection("interests", interest)}
              className="ml-2 text-blue-500 hover:text-blue-700"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Suggested Skills based on Stream */}
      {suggestedSkills.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 mb-2">Suggested for your stream ({formData.specialization}):</p>
          <div className="flex flex-wrap gap-2">
            {suggestedSkills.map((skill: string) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSelection("interests", skill)}
                className={`px-3 py-1 rounded-full text-xs transition-colors border ${formData.interests.includes(skill)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-blue-700 border-blue-200 hover:bg-blue-100"
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
              ? "bg-blue-50 border-blue-500 text-blue-600"
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
              ? "bg-blue-50 border-blue-500 text-blue-600 font-medium"
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
              ? "bg-blue-50 border-blue-500 text-blue-600 font-medium"
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
        onClick={handleNext}
        className="px-8 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
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
                  href={`http://127.0.0.1:8000/students/resume/download/${formData.resume.resume_file_path.split('/').pop()}`}
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

const ProfileView = ({ formData, onEdit, onLogout, handleResumeUpload }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fadeIn">
      {/* Upload Resume Hidden Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept=".pdf,.doc,.docx"
        className="hidden"
      />

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-brand-500 to-brand-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-32 h-32 rounded-2xl bg-white p-1 border-4 border-white shadow-lg overflow-hidden">
              {formData.resume.profile_picture ? (
                <img src={formData.resume.profile_picture} alt="Profile" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-4xl">👤</div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mb-2 justify-end items-center">
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
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
                {uploading ? 'Uploading...' : 'Upload Resume'}
              </button>

              {formData.resume.resume_file_path && (
                <a
                  href={`http://127.0.0.1:8000/students/resume/download/${formData.resume.resume_file_path.split('/').pop()}`}
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
                onClick={onEdit}
                className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
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
              <button
                onClick={onLogout}
                className="px-6 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-semibold hover:bg-red-100 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900">{formData.first_name} {formData.last_name}</h1>
            <p className="text-lg text-slate-600">{formData.resume.title || formData.specialization}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-slate-500 text-sm">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {formData.current_city}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {formData.phone_number}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
                {/* APAAR ID hidden as per requirements */}
                {/* APAAR ID: {formData.apaar_id} */}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Education & Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-brand-500">🎓</span> Education
            </h3>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{formData.course}</p>
                <p className="text-xs text-slate-500">{formData.specialization}</p>
                <p className="text-xs text-slate-400 mt-1">{formData.college_name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{formData.start_year} - {formData.end_year}</p>
              </div>
              {formData.resume.education_entries?.map((edu: any, i: number) => (
                <div key={i} className="pt-3 border-t border-slate-50">
                  <p className="font-semibold text-slate-800 text-sm">{edu.degree}</p>
                  <p className="text-xs text-slate-500">{edu.institution}</p>
                  <p className="text-xs text-slate-400 mt-1">{edu.year}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-brand-500">🌐</span> Languages
            </h3>
            <div className="flex flex-wrap gap-2">
              {formData.languages.map((lang: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-100">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Experience & Skills */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-brand-500">💼</span> Experience
            </h3>
            {formData.resume.work_experience?.length > 0 ? (
              <div className="space-y-6">
                {formData.resume.work_experience.map((exp: any, i: number) => (
                  <div key={i} className="relative pl-6 border-l-2 border-slate-100 pb-2 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-brand-100 border-2 border-white shadow-sm"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">{exp.position}</p>
                        <p className="text-sm text-brand-600 font-medium">{exp.company}</p>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">{exp.duration}</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {exp.achievements?.map((ach: string, j: number) => (
                        <li key={j} className="text-sm text-slate-600 flex gap-2">
                          <span className="text-brand-300 mt-1.5 w-1 h-1 rounded-full bg-brand-500 shrink-0"></span>
                          {ach}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm italic italic">No work experience added yet.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-brand-500">⚡</span> Skills
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Object.entries(formData.resume.skills_categorized || {}).map(([cat, skills]: [string, any]) => (
                <div key={cat}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{cat} Skills</p>
                  <div className="space-y-3">
                    {skills.map((skill: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{skill.name}</span>
                          <span className="text-xs text-slate-400">{skill.level}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${skill.level}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



export function StudentProfileSetup() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [isViewMode, setIsViewMode] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

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

  const handleResumeChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      resume: {
        ...prev.resume,
        [field]: value
      }
    }));
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 1. Client-side validation: File size (5MB)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        toast.error("File too large. Maximum size allowed is 5MB.");
        return;
      }

      // 2. Client-side validation: File type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file format. Please upload PDF, DOC, or DOCX.");
        return;
      }

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      try {
        setLoading(true);
        const response = await api.post("/students/me/resume/upload", formDataUpload);
        toast.success("Resume uploaded successfully!");
        
        // Refresh profile data if in view mode
        if (isViewMode) {
          fetchData();
        }
      } catch (err) {
        const error = err as ApiError;
        toast.error(error.message || "Failed to upload resume.");
      } finally {
        setLoading(false);
      }
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
      setStep(prev => prev + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
    setError(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEdit = () => {
    setIsViewMode(false);
    setStep(1);
  };

  const fetchData = async () => {
    const parseList = (str: string | null) => str ? str.split(", ").filter(Boolean) : [];
    const parseJSON = (val: any, fallback: any) => {
      if (!val) return fallback;
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch {
        return fallback;
      }
    };

    try {
      setInitialLoading(true);
      // Fetch Profile
      let profileData: any = null;
      try {
        console.log("Fetching student profile...");
        const profileRes = await api.get<Record<string, any>>("/students/me");
        console.log("Profile response received:", profileRes);
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

      if (profileData) {
        console.log("Profile data exists. Processing...");
        setHasProfile(true);
        // Check if edit mode is requested via URL params
        const isEditMode = searchParams.get("mode") === "edit";
        console.log("Edit mode requested:", isEditMode);

        // Simplified Logic: If profile data exists (fetched from API), show View Mode by default
        // Only show form if explicitly requested via ?mode=edit
        const shouldView = !isEditMode;
        console.log("Setting View Mode to:", shouldView);
        setIsViewMode(shouldView);
        
        setFormData(prev => ({
          ...prev,
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          phone_number: profileData.phone_number || "",
          current_city: profileData.current_city || "",
          gender: profileData.gender || "",
          languages: parseList(profileData.languages),
          apaar_id: profileData.apaar_id || "",
          profile_type: profileData.profile_type || "",
          course: profileData.degree || "",
          specialization: profileData.department || "",
          college_name: profileData.university_name || "",
          start_year: profileData.start_year ? String(profileData.start_year) : "",
          end_year: profileData.end_year ? String(profileData.end_year) : "",
          interests: parseList(profileData.interests),
          looking_for: parseList(profileData.looking_for),
          work_mode: parseList(profileData.work_mode),
          resume: resumeData ? {
            ...prev.resume,
            career_objective: resumeData.career_objective || "",
            work_experience: parseJSON(resumeData.work_experience, []),
            projects: parseJSON(resumeData.projects, []),
            certifications: parseJSON(resumeData.certifications, []),
            extra_curricular: parseJSON(resumeData.extra_curricular, []),
            education_entries: parseJSON(resumeData.education_entries, []),
            skills_categorized: parseJSON(resumeData.skills_categorized, { technical: [], soft: [], languages: [] }),
            title: resumeData.title || "",
            linkedin: resumeData.linkedin || "",
            resume_file_path: resumeData.resume_file_path || null,
            resume_filename: resumeData.resume_filename || null,
            resume_file_size: resumeData.resume_file_size || null,
            resume_uploaded_at: resumeData.resume_uploaded_at || null
          } : prev.resume
        }));
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

      try {
        await api.post("/students/me", profilePayload);
      } catch {
        // Profile might already exist, try PUT
        await api.put("/students/me", profilePayload);
      }

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
      navigate("/student");
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
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" key="form-mode">
      <div className={`${step === 4 ? 'max-w-[10in]' : 'max-w-2xl'} mx-auto bg-white rounded-xl shadow-lg p-8 transition-all duration-500`}>
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
              className="px-8 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
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
