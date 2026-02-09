# Praktiki API Documentation

> **Campus-to-Career Placement and Internship Ecosystem**  
> Version: 1.0.0 | Base URL: `http://localhost:8000`

---

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Student APIs](#student-apis)
3. [Employer APIs](#employer-apis)
4. [Institute APIs](#institute-apis)
5. [Data Models](#data-models)

---

## Authentication APIs

**Prefix:** `/auth`

### POST `/auth/signup`
Register a new student account.

**Request Body:**
```json
{
  "email": "student@example.com",
  "full_name": "John Doe",
  "password": "securePassword123",
  "role": "student",
  "apaar_id": "123456789012"  // Optional, 12-digit APAAR ID
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "student@example.com",
  "full_name": "John Doe",
  "role": "student"
}
```

**Errors:**
- `400`: Email already registered / APAAR ID already registered

---

### POST `/auth/signup/employer`
Register a new employer account.

**Request Body:**
```json
{
  "email": "hr@company.com",
  "full_name": "Jane Smith",
  "password": "securePassword123",
  "company_name": "TechCorp Inc",
  "contact_number": "+91-9876543210"
}
```

**Response:** `200 OK`
```json
{
  "id": 2,
  "email": "hr@company.com",
  "full_name": "Jane Smith",
  "role": "employer"
}
```

---

### POST `/auth/signup/institute`
Register a new institute account.

**Request Body:**
```json
{
  "email": "admin@college.edu",
  "full_name": "College Admin",
  "password": "securePassword123",
  "institute_name": "ABC Engineering College",
  "aishe_code": "C-12345",
  "contact_number": "+91-9876543210"
}
```

**Response:** `200 OK`
```json
{
  "id": 3,
  "email": "admin@college.edu",
  "full_name": "College Admin",
  "role": "institute"
}
```

**Errors:**
- `400`: Email already registered / AISHE code already registered

---

### POST `/auth/login`
Login to get access token.

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "securePassword123",
  "apaar_id": "123456789012"  // Optional, for students
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "role": "student",
  "is_email_verified": true,
  "is_phone_verified": false
}
```

**Errors:**
- `401`: Invalid email or password

---

### GET `/auth/verify-email`
Verify user email using token.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Email verification token |

**Response:** `200 OK`
```json
{
  "message": "Email verified successfully! You can now log in."
}
```

**Errors:**
- `400`: Invalid or expired verification token

---

### POST `/auth/forgot-password`
Request password reset token.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User's email address |

**Response:** `200 OK`
```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

---

### POST `/auth/reset-password`
Reset password using token.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Password reset token |
| `new_password` | string | Yes | New password |

**Response:** `200 OK`
```json
{
  "message": "Password has been reset successfully! You can now log in with your new password."
}
```

**Errors:**
- `400`: Invalid or expired reset token

---

### POST `/auth/request-otp`
Request OTP for email or phone verification.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "type": "email"  // or "phone"
}
```

**Response:** `200 OK`
```json
{
  "message": "OTP sent to email",
  "code": "1234"  // Demo mode only
}
```

---

### POST `/auth/verify-otp`
Verify OTP for email or phone.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "type": "email",
  "code": "1234"
}
```

**Response:** `200 OK`
```json
{
  "message": "Email verified",
  "is_email_verified": true
}
```

**Errors:**
- `400`: Invalid or expired OTP / No OTP requested

---

### GET `/auth/me`
Get current authenticated user info.

**Headers:** `Authorization: Bearer <access_token>`

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "student@example.com",
  "full_name": "John Doe",
  "role": "student",
  "is_email_verified": true,
  "is_phone_verified": false
}
```

---

## Student APIs

**Prefix:** `/students`  
**Authorization:** All endpoints require `Authorization: Bearer <access_token>`

### GET `/students/me`
Get current student's profile.

**Response:** `200 OK`
```json
{
  "id": 1,
  "user_id": 1,
  "email": "student@example.com",
  "apaar_id": "123456789012",
  "is_apaar_verified": true,
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "university_name": "ABC University",
  "degree": "B.Tech",
  "department": "Computer Science",
  "year": 3,
  "start_year": 2022,
  "end_year": 2026,
  "profile_type": "student",
  "cgpa": "8.5",
  "skills": "Python, JavaScript, React",
  "interests": "Web Development, AI",
  "projects": "E-commerce Website",
  "phone_number": "+91-9876543210",
  "current_city": "Mumbai",
  "gender": "male",
  "languages": "English, Hindi",
  "looking_for": "internship",
  "work_mode": "remote"
}
```

**Errors:**
- `403`: Not a student account
- `404`: Student profile not found

---

### POST `/students/me`
Create student profile.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+91-9876543210",
  "current_city": "Mumbai",
  "gender": "male",
  "languages": "English, Hindi",
  "apaar_id": "123456789012",
  "university_name": "ABC University",
  "degree": "B.Tech",
  "department": "Computer Science",
  "year": 3,
  "start_year": 2022,
  "end_year": 2026,
  "cgpa": "8.5",
  "skills": "Python, JavaScript",
  "interests": "Web Development",
  "looking_for": "internship",
  "work_mode": "remote"
}
```

**Response:** `200 OK` - Returns StudentProfileOut object

**Errors:**
- `403`: Only students can create profile
- `400`: Profile already exists

---

### PUT `/students/me`
Update student profile.

**Request Body:** Same as POST `/students/me` (all fields optional)

**Response:** `200 OK` - Returns updated StudentProfileOut

**Errors:**
- `403`: Only students can update profile
- `404`: Student profile not found
- `400`: APAAR ID already registered to another user

---

### GET `/students/me/resume`
Get student's resume data.

**Response:** `200 OK`
```json
{
  "id": 1,
  "student_id": 1,
  "career_objective": "To become a full-stack developer",
  "work_experience": "[{\"company\": \"TechCorp\", \"role\": \"Intern\", \"duration\": \"3 months\"}]",
  "projects": "[{\"name\": \"E-commerce App\", \"description\": \"Built with React\"}]",
  "certifications": "[\"AWS Certified\", \"Google Cloud\"]",
  "extra_curricular": "[\"Coding Club President\"]",
  "resume_file_path": "uploads/resumes/1_uuid.pdf",
  "education_entries": "[{\"degree\": \"B.Tech\", \"college\": \"ABC\"}]",
  "skills_categorized": "{\"technical\": [\"Python\"], \"soft\": [\"Communication\"]}",
  "title": "Software Developer",
  "linkedin": "https://linkedin.com/in/johndoe",
  "profile_picture": "https://example.com/photo.jpg"
}
```

---

### PUT `/students/me/resume`
Update student's resume.

**Request Body:**
```json
{
  "career_objective": "To become a full-stack developer",
  "work_experience": "[{\"company\": \"TechCorp\", \"role\": \"Intern\"}]",
  "projects": "[{\"name\": \"E-commerce App\"}]",
  "certifications": "[\"AWS Certified\"]",
  "extra_curricular": "[\"Coding Club\"]",
  "education_entries": "[{\"degree\": \"B.Tech\"}]",
  "skills_categorized": "{\"technical\": [\"Python\"]}",
  "title": "Software Developer",
  "linkedin": "https://linkedin.com/in/johndoe",
  "profile_picture": "https://example.com/photo.jpg"
}
```

**Response:** `200 OK` - Returns StudentResumeOut

---

### POST `/students/me/resume/upload`
Upload resume file (PDF).

**Headers:** `Content-Type: multipart/form-data`

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Resume file (PDF/DOC) |

**Response:** `200 OK`
```json
{
  "filename": "resume.pdf",
  "file_path": "uploads/resumes/1_abc123.pdf"
}
```

---

### POST `/students/me/skills`
Add a skill to student profile.

> **Note:** Requires APAAR verification

**Request Body:**
```json
{
  "name": "Python"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "python"
}
```

**Errors:**
- `403`: Verify APAAR to add skills
- `400`: Skill already added

---

### GET `/students/me/skills`
Get all skills of current student.

**Response:** `200 OK`
```json
[
  {"id": 1, "name": "python"},
  {"id": 2, "name": "javascript"},
  {"id": 3, "name": "react"}
]
```

---

### POST `/students/apply`
Apply for an internship.

> **Note:** Requires APAAR ID

**Request Body:**
```json
{
  "internship_id": 5
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "internship_id": 5,
  "status": "pending",
  "applied_at": "2024-01-15T10:30:00"
}
```

**Errors:**
- `403`: APAAR ID missing
- `400`: Already applied

---

### GET `/students/my-applications`
Get all applications of current student.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "internship_id": 5,
    "status": "pending",
    "applied_at": "2024-01-15T10:30:00",
    "internship": {
      "id": 5,
      "title": "Frontend Developer Intern",
      "description": "Work on React applications",
      "location": "Mumbai",
      "mode": "remote",
      "duration_weeks": 12,
      "company_name": "TechCorp Inc"
    }
  }
]
```

---

### GET `/students/recommendations`
Get AI-powered internship recommendations.

**Response:** `200 OK`
```json
[
  {
    "internship_id": 5,
    "title": "Frontend Developer Intern",
    "company_name": "TechCorp Inc",
    "match_score": 0.85,
    "matching_skills": ["JavaScript", "React"],
    "missing_skills": ["TypeScript"],
    "explanation": {
      "reason": "Strong match based on your React skills",
      "factors": ["skill_match", "location_preference"]
    },
    "status": "MATCHED",
    "reason": null,
    "rule_based_score": 0.8,
    "embedding_score": 0.9,
    "feedback_boost": 0.05,
    "cross_encoder_score": 0.85
  }
]
```

---

### POST `/students/feedback`
Record feedback for recommendation system.

**Request Body:**
```json
{
  "internship_id": 5,
  "action": "click"  // "view", "click", "apply", "ignore"
}
```

**Response:** `200 OK`
```json
{
  "status": "success"
}
```

---

### GET `/students/internships`
List all available internships with filters.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search in title/description |
| `location` | string | No | Filter by location |
| `mode` | string | No | Filter by mode (remote/onsite/hybrid) |

**Response:** `200 OK`
```json
[
  {
    "id": 5,
    "employer_id": 2,
    "title": "Frontend Developer Intern",
    "location": "Mumbai",
    "mode": "remote",
    "duration_weeks": 12
  }
]
```

---

### GET `/students/internships/{internship_id}`
Get detailed internship information.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `internship_id` | int | Internship ID |

**Response:** `200 OK`
```json
{
  "id": 5,
  "title": "Frontend Developer Intern",
  "description": "Work on cutting-edge React applications",
  "location": "Mumbai",
  "mode": "remote",
  "duration_weeks": 12,
  "stipend_amount": 15000,
  "deadline": "2024-02-28",
  "start_date": "2024-03-15",
  "skills": "React, JavaScript, CSS",
  "openings": 3,
  "qualifications": "B.Tech in CSE or equivalent",
  "benefits": "Certificate, PPO opportunity",
  "applicant_count": 25,
  "employer": {
    "id": 2,
    "company_name": "TechCorp Inc",
    "contact_number": "+91-9876543210",
    "industry": "Information Technology",
    "organization_description": "Leading software company",
    "website_url": "https://techcorp.com",
    "logo_url": "https://techcorp.com/logo.png",
    "city": "Mumbai"
  }
}
```

---

### GET `/students/internships/metadata`
Get metadata for internship mega menu (dynamic).

**Response:** `200 OK`
```json
{
  "top_locations": ["Mumbai", "Bangalore", "Delhi", "Hyderabad", "Pune"],
  "top_profiles": ["Frontend Developer", "Backend Developer", "Data Analyst", "UI/UX Designer"]
}
```

---

## Employer APIs

**Prefix:** `/employers`  
**Authorization:** All endpoints require `Authorization: Bearer <access_token>`

### GET `/employers/dashboard/metrics`
Get dashboard analytics.

**Response:** `200 OK`
```json
{
  "total_applicants": 150,
  "completed_internships": 5,
  "accepted_applications": 25,
  "rejected_applications": 45,
  "ongoing_programs": 3
}
```

---

### GET `/employers/profile`
Get employer profile with verification status.

**Response:** `200 OK`
```json
{
  "id": 2,
  "user_id": 5,
  "company_name": "TechCorp Inc",
  "contact_number": "+91-9876543210",
  "designation": "HR Manager",
  "organization_description": "Leading software company",
  "city": "Mumbai",
  "industry": "Information Technology",
  "employee_count": "100-500",
  "logo_url": "https://techcorp.com/logo.png",
  "website_url": "https://techcorp.com",
  "license_document_url": "https://docs.com/license.pdf",
  "social_media_link": "https://linkedin.com/company/techcorp",
  "is_verified": true,
  "is_email_verified": true,
  "is_phone_verified": true,
  "is_profile_complete": true,
  "is_fully_verified": true,
  "full_name": "Jane Smith",
  "email": "hr@techcorp.com"
}
```

---

### PUT `/employers/profile`
Update employer profile.

**Request Body:**
```json
{
  "company_name": "TechCorp Inc",
  "contact_number": "+91-9876543210",
  "designation": "HR Manager",
  "organization_description": "Leading software company",
  "city": "Mumbai",
  "industry": "Information Technology",
  "employee_count": "100-500",
  "logo_url": "https://techcorp.com/logo.png",
  "website_url": "https://techcorp.com",
  "license_document_url": "https://docs.com/license.pdf",
  "social_media_link": "https://linkedin.com/company/techcorp"
}
```

**Response:** `200 OK` - Returns EmployerProfileOut

---

### POST `/employers/internships`
Create a new internship posting.

> **Note:** Requires verified employer status

**Request Body:**
```json
{
  "title": "Frontend Developer Intern",
  "description": "Work on cutting-edge React applications",
  "location": "Mumbai",
  "mode": "remote",
  "duration_weeks": 12,
  "stipend_amount": 15000,
  "deadline": "2024-02-28",
  "start_date": "2024-03-15",
  "skills": ["React", "JavaScript", "CSS"],
  "openings": 3,
  "qualifications": "B.Tech in CSE or equivalent",
  "benefits": ["Certificate", "PPO opportunity"],
  "contact_name": "Jane Smith",
  "contact_email": "hr@techcorp.com",
  "contact_phone": "+91-9876543210",
  "application_link": "https://techcorp.com/apply",
  "application_email": "careers@techcorp.com"
}
```

**Response:** `200 OK`
```json
{
  "id": 5,
  "employer_id": 2,
  "title": "Frontend Developer Intern",
  "location": "Mumbai",
  "mode": "remote",
  "duration_weeks": 12
}
```

---

### GET `/employers/my-internships`
Get all internships posted by current employer.

**Response:** `200 OK`
```json
[
  {
    "id": 5,
    "employer_id": 2,
    "title": "Frontend Developer Intern",
    "location": "Mumbai",
    "mode": "remote",
    "duration_weeks": 12
  },
  {
    "id": 6,
    "employer_id": 2,
    "title": "Backend Developer Intern",
    "location": "Bangalore",
    "mode": "hybrid",
    "duration_weeks": 16
  }
]
```

---

### GET `/employers/internships/{internship_id}`
Get full internship details for employer preview.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `internship_id` | int | Internship ID |

**Response:** `200 OK`
```json
{
  "internship": {
    "id": 5,
    "title": "Frontend Developer Intern",
    "description": "Work on cutting-edge React applications",
    "location": "Mumbai",
    "mode": "remote",
    "duration_weeks": 12,
    "start_date": "2024-03-15",
    "end_date": null,
    "is_flexible_time": false,
    "stipend_amount": 15000,
    "stipend_currency": "INR",
    "stipend_cycle": "month",
    "deadline": "2024-02-28",
    "skills_required": "React, JavaScript, CSS",
    "qualifications": "B.Tech in CSE",
    "benefits": "Certificate, PPO",
    "openings": 3,
    "contact_name": "Jane Smith",
    "contact_email": "hr@techcorp.com",
    "contact_phone": "+91-9876543210",
    "application_link": "https://techcorp.com/apply",
    "application_email": "careers@techcorp.com"
  },
  "employer": {
    "id": 2,
    "company_name": "TechCorp Inc",
    "organization_description": "Leading software company",
    "city": "Mumbai",
    "industry": "Information Technology",
    "employee_count": "100-500",
    "logo_url": "https://techcorp.com/logo.png",
    "website_url": "https://techcorp.com",
    "is_verified": true,
    "contact_number": "+91-9876543210"
  }
}
```

---

### GET `/employers/applications/all`
Get all applications for employer's internships.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "student_id": 1,
    "internship_id": 5,
    "status": "pending",
    "applied_at": "2024-01-15T10:30:00",
    "student_name": "John Doe",
    "internship_title": "Frontend Developer Intern"
  }
]
```

---

### GET `/employers/internships/{internship_id}/applications`
Get applications for a specific internship with student details.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `internship_id` | int | Internship ID |

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "internship_id": 5,
    "status": "pending",
    "applied_at": "2024-01-15T10:30:00",
    "student": {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "university_name": "ABC University",
      "skills": "Python, JavaScript, React"
    }
  }
]
```

---

### PATCH `/employers/applications/{application_id}/status`
Update status of a single application.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `application_id` | int | Application ID |

**Request Body:**
```json
{
  "status": "accepted"  // "pending", "accepted", "rejected", "shortlisted"
}
```

**Response:** `200 OK`
```json
{
  "message": "Application status updated to accepted"
}
```

> **Note:** Sends email notification when status changes to "accepted"

---

### POST `/employers/applications/bulk-status`
Update status of multiple applications at once.

**Request Body:**
```json
{
  "application_ids": [1, 2, 3, 4, 5],
  "status": "shortlisted"
}
```

**Response:** `200 OK`
```json
{
  "message": "Successfully updated 5 applications to shortlisted"
}
```

**Errors:**
- `400`: Some applications not found or unauthorized

---

## Institute APIs

**Prefix:** `/institutes`  
**Authorization:** All endpoints require `Authorization: Bearer <access_token>`

### GET `/institutes/students`
Get all students belonging to the institute.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "department": "Computer Science",
    "year": 3,
    "apaar_id": "123456789012",
    "is_apaar_verified": true,
    "status": "Verified",
    "internships": [
      {
        "id": 5,
        "title": "Frontend Developer Intern",
        "company_name": "TechCorp Inc",
        "location": "Mumbai",
        "mode": "remote",
        "duration_weeks": 12
      }
    ],
    "total_internships": 1
  }
]
```

**Errors:**
- `403`: Only institutes can view this data
- `404`: Institute profile not found

---

## Data Models

### User Roles
| Role | Description |
|------|-------------|
| `student` | Student users who can apply for internships |
| `employer` | Company representatives who post internships |
| `institute` | Educational institutions that manage students |

### Application Status
| Status | Description |
|--------|-------------|
| `pending` | Application submitted, awaiting review |
| `shortlisted` | Candidate shortlisted for next round |
| `accepted` | Application accepted |
| `rejected` | Application rejected |

### Internship Mode
| Mode | Aliases | Description |
|------|---------|-------------|
| `remote` | wfh, work from home | Fully remote position |
| `onsite` | office, in-office | On-site at company location |
| `hybrid` | - | Mix of remote and on-site |

### Feedback Actions
| Action | Description |
|--------|-------------|
| `view` | User viewed the internship |
| `click` | User clicked on internship for details |
| `apply` | User applied for the internship |
| `ignore` | User ignored/dismissed the recommendation |

---

## Error Response Format

All API errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes
| Code | Description |
|------|-------------|
| `200` | Success |
| `400` | Bad Request - Invalid input data |
| `401` | Unauthorized - Invalid or missing token |
| `403` | Forbidden - Access denied |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error |

---

## Authentication

All protected endpoints require the following header:

```
Authorization: Bearer <access_token>
```

The access token is obtained from the `/auth/login` endpoint and should be included in all subsequent API requests.

---

## Interactive API Documentation

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## Internshala vs Praktiki: Feature Comparison & Gap Analysis

This section compares Praktiki's current API capabilities with Internshala's platform features and outlines the changes needed to achieve feature parity.

### 📊 Feature Comparison Matrix

| Feature Category | Internshala | Praktiki | Status |
|-----------------|-------------|----------|--------|
| **Student Features** | | | |
| Profile Management | ✅ Comprehensive | ✅ Available | ✅ Complete |
| ATS-Friendly Resume Builder | ✅ Full Builder | ⚠️ Basic Upload | 🔧 Needs Enhancement |
| Saved/Bookmarked Internships | ✅ Available | ❌ Not Available | 🆕 New Feature |
| Application Tracking Dashboard | ✅ Real-time | ⚠️ Basic List | 🔧 Needs Enhancement |
| Advanced Search Filters | ✅ 15+ Filters | ⚠️ 3 Filters | 🔧 Needs Enhancement |
| Weekly Preference Alerts | ✅ Email/Push | ❌ Not Available | 🆕 New Feature |
| Chat with Employers | ✅ Available | ❌ Not Available | 🆕 New Feature |
| Interview Self-Scheduling | ✅ Available | ❌ Not Available | 🆕 New Feature |
| AI Recommendations | ❌ Basic | ✅ Advanced ML | ✅ Ahead |
| **Employer Features** | | | |
| Company Profile | ✅ Detailed | ✅ Available | ✅ Complete |
| Company Verification | ✅ Multi-layer | ⚠️ Basic OTP | 🔧 Needs Enhancement |
| Internship Posting | ✅ Full | ✅ Available | ✅ Complete |
| Candidate Invitation | ✅ Available | ❌ Not Available | 🆕 New Feature |
| Interview Scheduler | ✅ Available | ❌ Not Available | 🆕 New Feature |
| Analytics Dashboard | ✅ Detailed | ⚠️ Basic Metrics | 🔧 Needs Enhancement |
| Bulk Application Actions | ✅ Available | ✅ Available | ✅ Complete |
| **Institute Features** | | | |
| Student Management | ⚠️ Limited | ✅ Available | ✅ Complete |
| Placement Reports | ✅ Available | ❌ Not Available | 🆕 New Feature |

---

### 🆕 NEW APIs Required

#### 1. Saved Internships API

**Purpose:** Allow students to bookmark internships for later review

```
POST   /students/saved-internships                    # Save an internship
GET    /students/saved-internships                    # Get all saved internships
DELETE /students/saved-internships/{internship_id}    # Remove from saved
```

**Schema (SavedInternship):**
```json
{
  "id": 1,
  "internship_id": 5,
  "saved_at": "2024-01-20T10:00:00",
  "notes": "Good fit for my skills"
}
```

---

#### 2. Job Alerts API

**Purpose:** Send personalized internship alerts based on preferences

```
POST   /students/alerts                 # Create alert preferences
GET    /students/alerts                 # Get current alert settings
PUT    /students/alerts                 # Update alert preferences
DELETE /students/alerts/{alert_id}      # Delete an alert
```

**Schema (AlertPreference):**
```json
{
  "id": 1,
  "keywords": ["Python", "Data Science"],
  "locations": ["Mumbai", "Remote"],
  "modes": ["remote", "hybrid"],
  "min_stipend": 10000,
  "frequency": "daily",                 // "daily", "weekly", "instant"
  "delivery_channels": ["email", "push"],
  "is_active": true
}
```

---

#### 3. Chat/Messaging API

**Purpose:** Enable real-time communication between employers and students

```
POST   /chat/conversations                              # Start conversation
GET    /chat/conversations                              # List all conversations
GET    /chat/conversations/{conversation_id}            # Get conversation details
POST   /chat/conversations/{conversation_id}/messages   # Send message
GET    /chat/conversations/{conversation_id}/messages   # Get messages
PUT    /chat/messages/{message_id}/read                 # Mark as read
```

**Schema (Message):**
```json
{
  "id": 1,
  "conversation_id": 10,
  "sender_id": 5,
  "sender_type": "employer",
  "content": "We would like to schedule an interview.",
  "sent_at": "2024-01-20T14:30:00",
  "is_read": false,
  "attachments": []
}
```

---

#### 4. Interview Scheduling API

**Purpose:** Allow employers to schedule and manage interviews

```
POST   /employers/interviews                           # Create interview slot
GET    /employers/interviews                           # List all interviews
GET    /employers/interviews/{interview_id}            # Get interview details
PUT    /employers/interviews/{interview_id}            # Update interview
DELETE /employers/interviews/{interview_id}            # Cancel interview
POST   /students/interviews/{interview_id}/confirm     # Student confirms slot
POST   /students/interviews/{interview_id}/reschedule  # Request reschedule
```

**Schema (Interview):**
```json
{
  "id": 1,
  "application_id": 15,
  "student_id": 1,
  "internship_id": 5,
  "scheduled_at": "2024-01-25T10:00:00",
  "duration_minutes": 30,
  "meeting_link": "https://meet.google.com/abc-xyz",
  "interview_type": "video",          // "video", "phone", "in_person"
  "status": "scheduled",              // "scheduled", "confirmed", "completed", "cancelled", "rescheduled"
  "notes": "Technical round - focus on React",
  "reminder_sent": true
}
```

---

#### 5. Candidate Invitation API

**Purpose:** Allow employers to invite promising candidates to apply

```
POST   /employers/invitations                     # Send invitation
GET    /employers/invitations                     # List sent invitations
GET    /students/invitations                      # Get received invitations
PUT    /students/invitations/{invitation_id}      # Accept/Decline invitation
```

**Schema (Invitation):**
```json
{
  "id": 1,
  "employer_id": 2,
  "student_id": 1,
  "internship_id": 5,
  "message": "Your profile impressed us. Would you like to apply?",
  "sent_at": "2024-01-18T09:00:00",
  "status": "pending",                // "pending", "accepted", "declined", "expired"
  "expires_at": "2024-01-25T09:00:00"
}
```

---

#### 6. Notification Center API

**Purpose:** Centralized notification management

```
GET    /notifications                             # Get all notifications
GET    /notifications/unread-count                # Get unread count
PUT    /notifications/{notification_id}/read      # Mark as read
PUT    /notifications/mark-all-read               # Mark all as read
DELETE /notifications/{notification_id}           # Delete notification
```

**Schema (Notification):**
```json
{
  "id": 1,
  "user_id": 1,
  "type": "application_status",      // "application_status", "new_match", "interview", "message", "reminder"
  "title": "Application Accepted!",
  "message": "Your application for Frontend Intern at TechCorp has been accepted.",
  "action_url": "/applications/15",
  "is_read": false,
  "created_at": "2024-01-20T15:00:00"
}
```

---

#### 7. Placement Reports API (Institute)

**Purpose:** Generate comprehensive placement analytics for institutes

```
GET    /institutes/reports/placement-summary      # Overall placement stats
GET    /institutes/reports/department-wise        # Department-wise breakdown
GET    /institutes/reports/company-wise           # Company-wise placements
GET    /institutes/reports/trend-analysis         # Year-over-year trends
POST   /institutes/reports/export                 # Export report as PDF/Excel
```

**Schema (PlacementReport):**
```json
{
  "academic_year": "2023-24",
  "total_students": 500,
  "placed_students": 420,
  "placement_rate": 84.0,
  "avg_stipend": 18500,
  "top_recruiters": [
    {"company": "TechCorp", "hires": 25},
    {"company": "DataInc", "hires": 18}
  ],
  "department_breakdown": [
    {"department": "CSE", "total": 120, "placed": 110, "rate": 91.6}
  ]
}
```

---

### 🔧 API ENHANCEMENTS Required

#### 1. Enhanced Search Filters

**Current:** `/students/internships?search=x&location=y&mode=z`

**Proposed Enhancement:**
```
GET /students/internships
```

| New Parameter | Type | Description |
|---------------|------|-------------|
| `stipend_min` | int | Minimum stipend amount |
| `stipend_max` | int | Maximum stipend amount |
| `duration_min` | int | Minimum duration (weeks) |
| `duration_max` | int | Maximum duration (weeks) |
| `skills` | string[] | Required skills filter |
| `posted_after` | date | Posted after date |
| `deadline_before` | date | Application deadline before |
| `company_size` | string | Company size (startup/mid/enterprise) |
| `industry` | string | Industry filter |
| `is_ppo` | boolean | Has PPO opportunity |
| `sort_by` | string | Sort: relevance/date/stipend/applicants |
| `page` | int | Pagination page |
| `limit` | int | Results per page (max 50) |

---

#### 2. Enhanced Resume Builder API

**Current:** Basic file upload only

**Proposed New Endpoints:**
```
GET    /students/me/resume/sections              # Get all resume sections
PUT    /students/me/resume/sections/{section}    # Update specific section
POST   /students/me/resume/generate-pdf          # Generate ATS-friendly PDF
GET    /students/me/resume/templates             # Available resume templates
POST   /students/me/resume/apply-template/{id}   # Apply a template
GET    /students/me/resume/ats-score             # Get ATS compatibility score
```

**ATS Score Response:**
```json
{
  "overall_score": 78,
  "breakdown": {
    "keywords": 85,
    "formatting": 70,
    "completeness": 80,
    "readability": 75
  },
  "suggestions": [
    "Add more technical skills relevant to your target roles",
    "Include quantifiable achievements in work experience",
    "Add a professional summary section"
  ]
}
```

---

#### 3. Enhanced Employer Analytics

**Current:** Basic metrics (total applicants, accepted, rejected)

**Proposed New Endpoints:**
```
GET /employers/analytics/overview                 # Enhanced dashboard
GET /employers/analytics/internship/{id}/funnel   # Application funnel
GET /employers/analytics/trends                   # Hiring trends over time
GET /employers/analytics/applicant-demographics   # Applicant analysis
```

**Enhanced Analytics Response:**
```json
{
  "overview": {
    "total_views": 1250,
    "total_applications": 150,
    "apply_rate": 12.0,
    "avg_time_to_hire": 14,
    "offer_acceptance_rate": 78.5
  },
  "funnel": {
    "viewed": 1250,
    "applied": 150,
    "shortlisted": 45,
    "interviewed": 30,
    "offered": 12,
    "accepted": 10
  },
  "source_breakdown": {
    "direct_search": 60,
    "recommendations": 35,
    "invitations": 5
  }
}
```

---

#### 4. Enhanced Company Verification

**Current:** Email + Phone OTP only

**Proposed New Verification Levels:**
```
POST /employers/verification/request              # Request verification
GET  /employers/verification/status               # Check verification status
POST /employers/verification/documents            # Upload verification docs
```

**Verification Levels:**
```json
{
  "level": "gold",                    // "basic", "verified", "gold", "premium"
  "email_verified": true,
  "phone_verified": true,
  "gstin_verified": true,
  "company_registration_verified": true,
  "linkedin_verified": false,
  "badge_display": "Verified Employer ✓",
  "verification_date": "2024-01-15"
}
```

---

### 📋 Implementation Priority

| Priority | Feature | Complexity | Impact | Sprint |
|----------|---------|------------|--------|--------|
| 🔴 High | Saved Internships | Low | High | 1 |
| 🔴 High | Enhanced Search Filters | Medium | High | 1 |
| 🔴 High | Notification Center | Medium | High | 1 |
| 🟡 Medium | Job Alerts | Medium | Medium | 2 |
| 🟡 Medium | Chat/Messaging | High | High | 2-3 |
| 🟡 Medium | Enhanced Analytics | Medium | Medium | 2 |
| 🟢 Low | Interview Scheduling | High | Medium | 3 |
| 🟢 Low | Candidate Invitation | Low | Low | 3 |
| 🟢 Low | Resume Builder Enhancement | High | Medium | 3-4 |
| 🟢 Low | Placement Reports | Medium | Medium | 4 |
| 🟢 Low | Enhanced Verification | Medium | Low | 4 |

---

### 🎯 Praktiki Advantages Over Internshala

While implementing the above features, Praktiki already has some advantages:

| Feature | Praktiki Advantage |
|---------|-------------------|
| **AI-Powered Recommendations** | Advanced ML with cross-encoder scoring, feedback learning, and explainable AI - Internshala lacks this |
| **APAAR ID Integration** | Government-verified student identity - unique to Praktiki |
| **Institute Integration** | Deep integration with educational institutes for tracking and verification |
| **Skill-Based Matching** | Rule-based + embedding-based hybrid scoring system |
| **Real-time Feedback Loop** | Continuous learning from user actions (view/click/apply/ignore) |

---

### 📝 Database Schema Additions Required

```sql
-- Saved Internships
CREATE TABLE saved_internships (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES student_profiles(id),
    internship_id INT REFERENCES internships(id),
    saved_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    UNIQUE(student_id, internship_id)
);

-- Job Alerts
CREATE TABLE job_alerts (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES student_profiles(id),
    keywords JSONB,
    locations JSONB,
    modes JSONB,
    min_stipend INT,
    frequency VARCHAR(20) DEFAULT 'weekly',
    channels JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES applications(id),
    created_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP
);

-- Messages
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INT REFERENCES conversations(id),
    sender_id INT REFERENCES users(id),
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

-- Interviews
CREATE TABLE interviews (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES applications(id),
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INT DEFAULT 30,
    meeting_link VARCHAR(500),
    interview_type VARCHAR(20) DEFAULT 'video',
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Invitations
CREATE TABLE invitations (
    id SERIAL PRIMARY KEY,
    employer_id INT REFERENCES employer_profiles(id),
    student_id INT REFERENCES student_profiles(id),
    internship_id INT REFERENCES internships(id),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
```

---

*Generated on: February 2026*
