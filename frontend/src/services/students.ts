/**
 * Student API services
 */
import { get, post, put } from './api';

export interface StudentProfile {
  id: number;
  user_id: number;
  full_name?: string;
  phone?: string;
  current_city?: string;
  preferred_location?: string;
  university?: string;
  degree?: string;
  graduation_year?: number;
  cgpa?: number;
  department?: string;
  year?: number;
  skills?: string;
  interests?: string;
  work_mode?: string;
  is_apaar_verified: boolean;
  apaar_id?: string;
  resume?: StudentResume;
  university_name?: string;
  start_year?: number | string;
  end_year?: number | string;
  email?: string;
}

export interface StudentResume {
  id: number;
  career_objective?: string;
  work_experience?: string; // JSON string
  projects?: string; // JSON string
  education_entries?: string; // JSON string
  skills_categorized?: string; // JSON string
  resume_file_path?: string;
}

export interface Skill {
  id: number;
  name: string;
}

export interface Application {
  id: number;
  internship_id: number;
  status: string;
  applied_at: string;
}

export interface Recommendation {
  internship_id: number;
  title: string;
  company_name: string;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  status: string;
}

/**
 * Get student profile
 */
export const getProfile = (): Promise<StudentProfile> => {
  return get<StudentProfile>('/students/me');
};

/**
 * Update student profile
 */
export const updateProfile = (data: Partial<StudentProfile>): Promise<StudentProfile> => {
  return put<StudentProfile>('/students/me', data);
};

/**
 * Get student skills
 */
export const getSkills = (): Promise<Skill[]> => {
  return get<Skill[]>('/students/me/skills');
};

/**
 * Add a skill
 */
export const addSkill = (name: string): Promise<Skill> => {
  return post<Skill>('/students/me/skills', { name });
};

/**
 * Get my applications
 */
export const getApplications = (): Promise<Application[]> => {
  return get<Application[]>('/students/my-applications');
};

/**
 * Apply for internship
 */
export const applyForInternship = (internshipId: number): Promise<Application> => {
  return post<Application>('/students/apply', { internship_id: internshipId });
};

/**
 * Get AI recommendations
 */
export const getRecommendations = (): Promise<Recommendation[]> => {
  return get<Recommendation[]>('/students/recommendations');
};

export interface ResumeSuggestionResponse {
  suggestions: string[];
}

/**
 * Get Resume Suggestions
 */
export const getResumeSuggestions = (section: string, currentContent?: string, context?: any): Promise<ResumeSuggestionResponse> => {
  return post<ResumeSuggestionResponse>('/students/me/resume/suggestions', { section, current_content: currentContent, context });
};

export interface ResumeParseResponse {
  career_objective: string;
  skills: string[];
  education: Array<{
    degree: string;
    university: string;
    start_year: string;
    end_year: string;
  }>;
  experience: Array<{
    role: string;
    company: string;
    duration: string;
    description: string;
  }>;
  projects: Array<{
    title: string;
    link: string;
    description: string;
  }>;
}

/**
 * Parse uploaded resume
 */
export const parseResume = (file: File): Promise<ResumeParseResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  return post<ResumeParseResponse>('/students/me/resume/parse', formData);
};

/**
 * Update student resume
 */
export const updateResume = (data: Partial<StudentResume>): Promise<StudentResume> => {
  return put<StudentResume>('/students/me/resume', data);
};

/**
 * Record feedback (like, dismiss, apply)
 */
export const recordFeedback = (internshipId: number, action: string): Promise<{ status: string }> => {
  return post<{ status: string }>('/students/feedback', { internship_id: internshipId, action });
};
