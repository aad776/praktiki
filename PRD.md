# Praktiki Product Requirements Document (PRD)

**Version:** 1.0
**Date:** February 12, 2026
**Project Team:** Gemini CLI

---

## 1. Objective/Goal

**Project Vision:** To build Praktiki, a next-generation, unified platform that bridges the gap between academic preparation and industrial requirements for Indian college students, while providing recruiters with precision tools for talent acquisition.

**Core Objectives for this Release:**
*   **Democratize Access**: Provide equal opportunity discovery for students across all institutions.
*   **Trust Layer**: Eliminate fake listings and unverified profiles through robust verification processes.
*   **AI-Driven Matching**: Offer skill-based internship recommendations beyond simple keyword matching, utilizing advanced AI/ML models.
*   **Academic Integration**: Facilitate ABC (Activity-Based Credit) mapping for completed internships, aligning industrial experience with academic recognition.
*   **Feedback Loop**: Establish a two-way feedback system for continuous improvement of students, companies, and the platform.

## 2. Features

This release focuses on delivering a Minimum Viable Product (MVP) across key functional modules, as defined in the `REQUIREMENTS_ANALYSIS.md`.

### Module 1: User & Role Management

*   **Description:** Enables different user types (students, companies, admin) to securely access the Praktiki platform with controlled permissions. This is the foundational module for user identity and access.
*   **Goal:** Provide secure, role-based access to the platform.
*   **Use Cases:**
    *   **UC1.1 - Student Registration:** A new student can register using their email or phone number and verify their account via OTP.
    *   **UC1.2 - Company Registration:** A new company representative can register, with role assignment and subsequent verification by an admin.
    *   **UC1.3 - User Login:** Any registered user can log in using their credentials, authenticated via JWT.
    *   **UC1.4 - Password Reset:** Users can initiate a password reset process if they forget their password.

### Module 2: Student Profile & CV Intake

*   **Description:** Allows students to create comprehensive profiles and upload their resumes, which are then processed to extract relevant information. This forms the primary input for the matching engine.
*   **Goal:** Capture detailed student data and CVs to inform the matching process.
*   **Use Cases:**
    *   **UC2.1 - Create/Update Student Profile:** A student can create or update their personal details, academic information, and career aspirations.
    *   **UC2.2 - CV Upload & Processing:** A student can upload their CV (PDF/DOCX), which the system automatically parses to extract raw text and identify key information.
    *   **UC2.3 - Education & Experience Details:** Students can manually add or edit their educational qualifications and work experience.

### Module 3: Skill Taxonomy & Skill Library

*   **Description:** A centralized system to define, categorize, and manage a standardized library of skills. This ensures consistency across internship requirements, student profiles, and credit mapping.
*   **Goal:** Maintain a consistent and standardized definition of skills across the platform.
*   **Use Cases:**
    *   **UC3.1 - Administer Skill Categories:** An admin can create, edit, or delete skill categories (e.g., Technical, Soft Skills, Domain).
    *   **UC3.2 - Manage Skills:** An admin can add, update, or remove specific skills within categories.
    *   **UC3.3 - Skill Search & Filter:** Any user can browse or search the skill library to understand available skills.

### Module 4: Skill Extraction & Vectorization (AI/ML Component)

*   **Description:** This AI-powered module processes unstructured text (e.g., from CVs) to identify and extract relevant skills, then converts these skills into numerical representations (vectors) for machine matching.
*   **Goal:** Convert unstructured student data into structured, machine-readable skill profiles and vectors.
*   **Use Cases:**
    *   **UC4.1 - Automated Skill Extraction:** Upon CV upload or profile update, the system automatically identifies skills from the text using NLP techniques (e.g., NER, keyword matching).
    *   **UC4.2 - Skill Confidence Scoring:** The system assigns a confidence score to each extracted skill.
    *   **UC4.3 - Generate Skill Vectors:** The extracted skills are used to generate a unique semantic vector (embedding) for each student's skill profile, enabling advanced similarity comparisons.

### Module 5: Internship Posting

*   **Description:** Provides companies with tools to create and manage internship listings, specifying detailed requirements including skills, duration, stipend, and location.
*   **Goal:** Enable companies to easily post detailed internship opportunities with clear skill requirements.
*   **Use Cases:**
    *   **UC5.1 - Company Profile Management:** A company representative can create and update their company's profile.
    *   **UC5.2 - Create Internship Posting:** A company can create a new internship listing, defining its title, description, responsibilities, duration, stipend, and specific required/optional skills.
    *   **UC5.3 - Manage Internship Status:** Companies can update the status of their internship postings (e.g., draft, active, closed).

### Module 6: AI Matching & Recommendation (AI/ML Component)

*   **Description:** The core AI engine that matches students to internships based on the semantic similarity of their skill vectors and other criteria. It provides ranked recommendations and insights into skill gaps.
*   **Goal:** Provide highly relevant, ranked internship recommendations to students and efficient candidate filtering for companies.
*   **Use Cases:**
    *   **UC6.1 - Student Recommendations:** A student receives a personalized list of recommended internships ranked by match score.
    *   **UC6.2 - Match Explanation:** Students can view a breakdown of why an internship was recommended, including skill alignment and identified skill gaps.
    *   **UC6.3 - Apply to Internship:** Students can apply to internships directly through the platform.
    *   **UC6.4 - View Applicants:** Companies can view a list of applicants for their internships, potentially ranked by match score.
    *   **UC6.5 - Update Application Status:** Companies can update the status of student applications (e.g., pending, shortlisted, accepted, rejected), triggering notifications.

### Module 7: Internship Feedback & Completion

*   **Description:** Facilitates the recording of internship completions and gathers structured feedback from both students and companies, including skill validation.
*   **Goal:** Track internship completion and gather valuable feedback for continuous improvement and skill validation.
*   **Use Cases:**
    *   **UC7.1 - Mark Internship as Completed:** Companies or students can mark an internship as completed.
    *   **UC7.2 - Student Feedback:** Students can provide feedback and ratings on their internship experience.
    *   **UC7.3 - Company Feedback & Skill Validation:** Companies can provide feedback on student performance and explicitly validate skills acquired or demonstrated during the internship.

### Module 8: ABC Credit Mapping & Credit Ledger

*   **Description:** Translates completed and validated internships into formal academic credits (Activity-Based Credits), maintaining a transparent ledger for each student.
*   **Goal:** Formally recognize practical experience through academic credits and provide a clear record for students.
*   **Use Cases:**
    *   **UC8.1 - Administer Credit Rules:** An admin can define and manage rules for awarding credits based on internship duration, type, and validated skills.
    *   **UC8.2 - Auto-Award Credits:** Upon verified internship completion, the system automatically calculates and awards academic credits to the student.
    *   **UC8.3 - View Credit Ledger:** Students can view their total accumulated credits and a detailed history of credit transactions.

## 3. UX Flow & Design Notes

The platform will feature a modern, intuitive, and responsive user interface across all three portals (Student, Company, Admin).

*   **Core Flow (Student):** `Sign Up/Login → Create/Update Profile → Browse Internships (with AI Recommendations) → Apply → (Post-Internship) Provide Feedback → View Earned Credits.`
*   **Core Flow (Employer):** `Sign Up/Login → Complete Profile (Verification) → Post Internships → View Applications → Update Application Status (Triggering Notifications).`
*   **Design Principles:**
    *   Clean and minimalistic design.
    *   Mobile-first responsiveness.
    *   Clear calls-to-action.
    *   Intuitive navigation for each user role.
    *   Accessibility considerations for all users.
*   **Authentication:** Clear visual cues for login/signup, OTP verification, and password recovery.
*   **Data Input:** User-friendly forms with clear validation and feedback for profile creation, CV uploads, and internship postings.
*   **AI Integration:** Recommendations will be prominently displayed with clear match scores and explanations.
*   **Visual Consistency:** Tailwind CSS ensures a consistent design system across the application.

## 4. System & Environment Requirements

### System Overview

Praktiki is a campus-to-career placement and internship ecosystem built as a three-service architecture designed for deployment on separate AWS EC2 instances.

*   **Frontend:** React 18 + Vite 5 + TypeScript + Tailwind CSS (SPA served as static files by Nginx).
*   **Backend API:** FastAPI + SQLAlchemy + PostgreSQL (Authentication, business logic, data access).
*   **AI Matching:** FastAPI + Sentence Transformers + PyTorch (ML-based internship recommendations).

### Hardware Requirements (AWS EC2 Instances)

*   **Frontend Instance:** `t2.micro` (1 GB RAM) - Nginx + static assets.
*   **Backend API Instance:** `t2.micro` or `t2.small` (1-2 GB RAM) - FastAPI + PostgreSQL client.
*   **AI Matching Instance:** `t2.medium` **minimum** (4 GB RAM) - FastAPI + ML models (requires significant RAM for model loading).

### Software & Environment Requirements

*   **Operating System:** Ubuntu 22.04 LTS for all EC2 instances.
*   **Database:** PostgreSQL (primary relational data store).
*   **Web Server/Reverse Proxy:** Nginx (for all services).
*   **Python:** Python 3 (for Backend and AI Matching services).
*   **Node.js:** Node.js 20 LTS (for Frontend build toolchain - build-time only).
*   **ML Models:** Sentence Transformers `all-MiniLM-L6-v2` and PyTorch runtime (for AI Matching service).
*   **Firewall:** UFW (Uncomplicated Firewall) enabled on all instances.
*   **Process Management:** `systemd` (for Backend and AI Matching services).

### Non-Functional Requirements

*   **Performance:**
    *   Page load time: < 2 seconds.
    *   API response time: < 500ms (p95).
    *   CV text extraction: < 10 seconds.
    *   Recommendation generation: < 2 seconds.
    *   Support for 10,000+ concurrent users (MVP scale).
*   **Scalability:**
    *   Horizontal scaling for Frontend and Backend.
    *   Vertical scaling for AI Matching (upgrade instance type/RAM if needed).
    *   Connection pooling for the database.
    *   Vector search < 100ms for 100K vectors.
*   **Availability & Reliability:**
    *   System uptime: 99.9%.
    *   Daily automated data backups.
    *   Error rate: < 0.1%.
*   **Security:**
    *   Data encryption at rest (AES-256) and in transit (TLS 1.3).
    *   Authentication via JWT + OTP.
    *   Password storage using bcrypt.
    *   File upload validation (type + size limits).
    *   Role-Based Access Control (RBAC) across all APIs.

## 5. Assumptions, Constraints & Dependencies

### Assumptions

*   **Internet Connectivity:** All users (students, companies, admins) are assumed to have reliable internet access to use the platform.
*   **User Proficiency:** Users are assumed to have basic digital literacy to navigate web applications.
*   **ML Model Availability:** The `all-MiniLM-L6-v2` Sentence Transformer model will remain publicly available and suitable for our needs.
*   **AWS Infrastructure:** AWS EC2 instances and associated services (e.g., PostgreSQL for DB) will be used for hosting.
*   **Email/SMS Gateway:** A reliable third-party service will be available for sending OTPs and email notifications (e.g., SMTP server).

### Constraints

*   **Budgetary:** Deployment will initially leverage cost-effective AWS EC2 instances (`t2.micro`, `t2.medium`).
*   **Technical:**
    *   **AI Matching Data Source:** The AI Matching service currently loads data from static JSON files (`students.json`, `internships.json`) rather than the live database. This is a temporary constraint for the MVP, to be addressed in future phases.
    *   **AI Feedback/Metrics Persistence:** AI feedback and analytics metrics are currently in-memory and lost on restart. Persistence will be a future enhancement.
    *   **Resume Storage:** Resume files are stored on local EC2 disk (`uploads/resumes/`), posing a single point of failure. S3 migration is a known future requirement.
    *   **API Design:** The `BACKEND_API_URL` variable in the AI Matching service is declared but not actively used in current code paths, implying backend-AI communication primarily via in-process import.
*   **Time:** The project is being developed with an MVP approach across distinct drops, prioritizing core functionality first.

### Dependencies

*   **External APIs:**
    *   **SMTP Server:** For email verification, password resets, and application notifications. (Graceful degradation if unavailable).
    *   **AWS Services:** EC2, potentially S3 (for future resume storage), RDS (for managed PostgreSQL), Route 53 (for domain management).
*   **Third-Party Libraries:**
    *   Python Libraries: FastAPI, SQLAlchemy, Alembic, Pydantic, python-jose, passlib, psycopg2-binary, Sentence-Transformers, PyTorch, scikit-learn, NumPy.
    *   JavaScript Libraries: React, Vite, TypeScript, Tailwind CSS, React Router DOM, Axios, Leaflet.
*   **Data Integrity:** The accuracy and consistency of the skill taxonomy (Module 3) are critical for effective AI matching (Module 6) and credit mapping (Module 8).
*   **User Data:** Complete and accurate student profiles (Module 2) and internship postings (Module 5) are essential for the AI matching engine to function optimally.
*   **Verification Gates:** Employer verification (profile completeness) and student email/phone verification are critical for maintaining a "Trust Layer" on the platform. (Currently, some verification checks are commented out and need to be re-enabled).
*   **Security Configuration:** Proper configuration of `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`, and other environment variables is crucial for security and functionality.
