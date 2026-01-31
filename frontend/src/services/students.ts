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

/**
 * Record feedback (like, dismiss, apply)
 */
export const recordFeedback = (internshipId: number, action: string): Promise<{ status: string }> => {
  return post<{ status: string }>('/students/feedback', { internship_id: internshipId, action });
};
