/**
 * Employer API services
 */
import { get, post, put } from './api';

export interface Internship {
  id: number;
  employer_id: number;
  title: string;
  description: string;
  location: string;
  mode: string;
  duration_weeks: number;
}

export interface InternshipCreate {
  title: string;
  description: string;
  location: string;
  mode: string;
  duration_weeks: number;
}

export interface ApplicationWithStudent {
  id: number;
  student_id: number;
  internship_id: number;
  status: string;
  applied_at: string;
}

/**
 * Create a new internship posting
 */
export const createInternship = (data: InternshipCreate): Promise<Internship> => {
  return post<Internship>('/employers/internships', data);
};

/**
 * Get employer's posted internships
 */
export const getMyInternships = (): Promise<Internship[]> => {
  return get<Internship[]>('/employers/my-internships');
};

/**
 * Get applications for a specific internship
 */
export const getInternshipApplications = (internshipId: number): Promise<ApplicationWithStudent[]> => {
  return get<ApplicationWithStudent[]>(`/employers/internships/${internshipId}/applications`);
};

/**
 * Update application status
 */
export const updateApplicationStatus = (
  applicationId: number,
  status: string
): Promise<{ message: string }> => {
  return put<{ message: string }>(`/employers/applications/${applicationId}/status`, { status });
};
