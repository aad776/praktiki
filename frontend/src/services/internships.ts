/**
 * Internship API services (public endpoints)
 */
import { get } from './api';

export interface InternshipDetails {
  id: number;
  title: string;
  description: string;
  location: string;
  mode: string;
  duration_weeks: number;
  employer?: {
    company_name: string;
    contact_number?: string;
  };
}

export interface InternshipFilters {
  search?: string;
  location?: string;
  mode?: string;
}

/**
 * List all internships with optional filters
 */
export const listInternships = (filters?: InternshipFilters): Promise<InternshipDetails[]> => {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.location) params.location = filters.location;
  if (filters?.mode) params.mode = filters.mode;
  
  return get<InternshipDetails[]>('/students/internships', params);
};

/**
 * Get internship details by ID
 */
export const getInternshipById = (id: number): Promise<InternshipDetails> => {
  return get<InternshipDetails>(`/students/internships/${id}`);
};
