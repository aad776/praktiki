# 📋 Comprehensive Requirement Analysis
## Praktiki - Campus-to-Career Placement and Internship Ecosystem

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [MVP Flow & Build Sequence](#2-mvp-flow--build-sequence)
3. [Module Specifications](#3-module-specifications)
4. [Stakeholder Analysis](#4-stakeholder-analysis)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Technology Stack & Justification](#6-technology-stack--justification)
7. [System Architecture](#7-system-architecture)
8. [AI/ML Components](#8-aiml-components)
9. [Security & Compliance](#9-security--compliance)
10. [Database Schema](#10-database-schema)
11. [API Specifications](#11-api-specifications)
12. [Risk Assessment](#12-risk-assessment)

---

## 1. Executive Summary

### Project Vision
Build **Praktiki** - a next-generation, unified platform that bridges the gap between academic preparation and industrial requirements for Indian college students, while providing recruiters with precision tools for talent acquisition.

### Core MVP Flow
```
Profile → Skills → Match → Internship → Feedback → Credits
```

### Core Objectives
- **Democratize Access**: Equal opportunity discovery for students across all institutions
- **Trust Layer**: Eliminate fake listings and unverified profiles through verification
- **AI-Driven Matching**: Skill-based recommendations beyond simple keyword matching
- **Academic Integration**: ABC Credit mapping for completed internships
- **Feedback Loop**: Two-way feedback system for continuous improvement

### Key Actors
| Actor | Role |
|-------|------|
| **Student** | Create profile, upload CV, receive matches, complete internships, earn credits |
| **Company** | Post internships, define skill requirements, provide feedback |
| **Admin** | Manage skill taxonomy, oversee platform, configure credit rules |

---

## 2. MVP Flow & Build Sequence

### 2.1 MVP Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PROFILE    │────▶│    SKILLS    │────▶│    MATCH     │
│  (Module 2)  │     │  (Module 4)  │     │  (Module 6)  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CREDITS    │◀────│   FEEDBACK   │◀────│  INTERNSHIP  │
│  (Module 8)  │     │  (Module 7)  │     │  (Module 5)  │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 2.2 Build Sequence - Drop Plan

| Drop | Colour Code | End Date | Modules Included |
|------|-------------|----------|------------------|
| **Drop 1** | 🟡 Yellow | 28-Jan-2026 | Module 1, 2, 3 |
| **Drop 2** | 🟢 Green | TBD | Module 4, 5, 6 |
| **Drop 3** | 🔴 Red | TBD | Module 7, 8 |

### 2.3 Module Dependency Graph

```
                    ┌─────────────────────┐
                    │  Module 1: User &   │
                    │  Role Management    │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Module 2:       │  │ Module 3: Skill │  │ Module 5:       │
│ Student Profile │  │ Taxonomy        │  │ Internship      │
│ & CV Intake     │  │ & Library       │  │ Posting         │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └─────────┬──────────┘                    │
                   │                               │
                   ▼                               │
         ┌─────────────────┐                       │
         │ Module 4: Skill │                       │
         │ Extraction &    │                       │
         │ Vectorization   │                       │
         └────────┬────────┘                       │
                  │                                │
                  └────────────┬───────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │ Module 6: AI    │
                    │ Matching &      │
                    │ Recommendation  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Module 7:       │
                    │ Internship      │
                    │ Feedback        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Module 8: ABC   │
                    │ Credit Mapping  │
                    │ & Ledger        │
                    └─────────────────┘
```

---

## 3. Module Specifications

### Module 1: User & Role Management

#### 1.1 Business Scope
Enable different actors (students, companies, admin) to access Praktiki with controlled permissions.

#### 1.2 Technical Tasks
| Task ID | Task | Priority | Complexity |
|---------|------|----------|------------|
| M1-T01 | User registration flow (email/phone) | High | Medium |
| M1-T02 | User login with OTP verification | High | Medium |
| M1-T03 | Role assignment (student/company/admin) | High | Low |
| M1-T04 | Session/token-based authentication (JWT) | High | Medium |
| M1-T05 | Password reset flow | Medium | Low |
| M1-T06 | Role-based access control (RBAC) | High | Medium |

#### 1.3 Outputs
- Authenticated user sessions
- Role-tagged user records
- JWT tokens for API authorization

#### 1.4 Dependencies
- **None** (foundational module)

#### 1.5 Database Entities
```sql
users (id, email, phone, password_hash, role, is_verified, created_at, updated_at)
sessions (id, user_id, token, expires_at, created_at)
```

#### 1.6 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| POST | `/auth/verify-otp` | Verify OTP |
| POST | `/auth/logout` | Logout user |
| POST | `/auth/refresh-token` | Refresh JWT |
| GET | `/auth/me` | Get current user |

---

### Module 2: Student Profile & CV Intake

#### 2.1 Business Scope
Capture student background information and CV data as the primary input to the system.

#### 2.2 Technical Tasks
| Task ID | Task | Priority | Complexity |
|---------|------|----------|------------|
| M2-T01 | Profile creation/edit form | High | Medium |
| M2-T02 | CV upload (PDF/DOCX) | High | Medium |
| M2-T03 | Text extraction from CV (PyPDF2/python-docx) | High | High |
| M2-T04 | Store raw CV text in database | High | Low |
| M2-T05 | Profile photo upload | Low | Low |
| M2-T06 | Education details form | High | Medium |/
| M2-T07 | Experience details form | Medium | Medium |

#### 2.3 Outputs
- Student profile data (structured)
- Extracted CV text (unstructured)
- Uploaded CV file (stored in S3/cloud storage)

#### 2.4 Dependencies
- **Module 1**: User & Role Management

#### 2.5 Database Entities
```sql
student_profiles (
    id, user_id, full_name, dob, gender, 
    phone, location, bio, profile_photo_url,
    created_at, updated_at
)

education (
    id, student_id, institution, degree, 
    branch, cgpa, start_year, end_year
)

experience (
    id, student_id, company, role, 
    description, start_date, end_date
)

cv_documents (
    id, student_id, file_url, file_type, 
    raw_text, uploaded_at
)
```

#### 2.6 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/students/profile` | Get student profile |
| PUT | `/students/profile` | Update student profile |
| POST | `/students/cv/upload` | Upload CV file |
| GET | `/students/cv` | Get CV details |
| POST | `/students/education` | Add education entry |
| PUT | `/students/education/{id}` | Update education entry |
| POST | `/students/experience` | Add experience entry |

---

### Module 3: Skill Taxonomy & Skill Library

#### 3.1 Business Scope
Maintain a standardized definition of skills to ensure consistency across matching and credits.

#### 3.2 Technical Tasks
| Task ID | Task | Priority | Complexity |
|---------|------|----------|------------|
| M3-T01 | Create skill categories (Technical, Soft, Domain) | High | Low |
| M3-T02 | Create sub-skills under categories | High | Medium |
| M3-T03 | Manage skill synonyms/aliases | Medium | Medium |
| M3-T04 | Admin interface for CRUD on skills | High | Medium |
| M3-T05 | Import initial skill dataset | High | Low |
| M3-T06 | Skill search/filter API | Medium | Low |

#### 3.3 Outputs
- Central skill dictionary (database)
- Skill hierarchy (categories → skills)
- Synonym mapping for NLP matching

#### 3.4 Dependencies
- **None** (can be built in parallel with Module 1)

#### 3.5 Database Entities
```sql
skill_categories (
    id, name, description, icon, created_at
)

skills (
    id, category_id, name, description, 
    difficulty_level, created_at
)

skill_synonyms (
    id, skill_id, synonym, created_at
)
```

#### 3.6 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/skills` | List all skills |
| GET | `/skills/categories` | List skill categories |
| GET | `/skills/{id}` | Get skill details |
| POST | `/admin/skills` | Create skill (admin) |
| PUT | `/admin/skills/{id}` | Update skill (admin) |
| DELETE | `/admin/skills/{id}` | Delete skill (admin) |
| POST | `/admin/skills/{id}/synonyms` | Add synonym |

#### 3.7 Initial Skill Categories
| Category | Example Skills |
|----------|---------------|
| **Programming** | Python, JavaScript, Java, C++, SQL |
| **Frameworks** | React, Node.js, Django, Flutter, TensorFlow |
| **Data & AI** | Machine Learning, Data Analysis, NLP, Computer Vision |
| **Design** | UI/UX, Figma, Adobe XD, Photoshop |
| **Soft Skills** | Communication, Leadership, Teamwork, Problem Solving |
| **Domain** | Finance, Healthcare, E-commerce, EdTech |

---

### Module 4: Skill Extraction & Vectorization

#### 4.1 Business Scope
Convert unstructured CV text into structured, machine-readable skills.

#### 4.2 Technical Tasks
| Task ID | Task | Priority | Complexity |
|---------|------|----------|------------|
| M4-T01 | Parse CV text (cleaning, normalization) | High | Medium |
| M4-T02 | Keyword matching against skill taxonomy | High | Medium |
| M4-T03 | NER-based skill extraction (SpaCy/BERT) | High | High |
| M4-T04 | Assign confidence/weight to extracted skills | Medium | Medium |
| M4-T05 | Generate skill vectors (embeddings) | High | High |
| M4-T06 | Store skill vectors in vector database | High | Medium |
| M4-T07 | Re-extraction trigger on CV update | Medium | Low |

#### 4.3 Outputs
- Structured student skill list with confidence scores
- Skill vectors (768-dim embeddings)
- Skill gap identification

#### 4.4 Dependencies
- **Module 2**: Student Profile & CV Intake
- **Module 3**: Skill Taxonomy & Skill Library

#### 4.5 Database Entities
```sql
student_skills (
    id, student_id, skill_id, confidence_score,
    source (cv/manual/verified), extracted_at
)

skill_vectors (
    id, student_id, vector (ARRAY[768]), 
    model_version, created_at
)
```

#### 4.6 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/students/skills/extract` | Trigger skill extraction |
| GET | `/students/skills` | Get extracted skills |
| POST | `/students/skills/manual` | Add skill manually |
| DELETE | `/students/skills/{id}` | Remove skill |
| GET | `/students/skills/vector` | Get skill vector |

#### 4.7 Extraction Pipeline
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Raw CV     │────▶│  Text       │────▶│  NER +      │
│  Text       │     │  Cleaning   │     │  Keyword    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Store in   │◀────│  Generate   │◀────│  Match to   │
│  Vector DB  │     │  Embeddings │     │  Taxonomy   │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

### Module 5: Internship / Task Posting

#### 5.1 Business Scope
Allow companies to define internship opportunities with clear skill requirements.

#### 5.2 Technical Tasks
| Task ID | Task | Priority | Complexity |
|---------|------|----------|------------|
| M5-T01 | Company profile creation | High | Medium |
| M5-T02 | Internship posting form | High | Medium |
| M5-T03 | Required vs optional skills selection | High | Medium |
| M5-T04 | Duration, stipend, effort level fields | High | Low |
| M5-T05 | Internship status management (draft/active/closed) | High | Low |
| M5-T06 | Generate skill vectors for postings | High | Medium |
| M5-T07 | Internship search/filter for students | High | Medium |

#### 5.3 Outputs
- Internship/task records
- Skill requirement profiles
- Posting skill vectors

#### 5.4 Dependencies
- **Module 1**: User & Role Management
- **Module 3**: Skill Taxonomy & Skill Library

#### 5.5 Database Entities
```sql
company_profiles (
    id, user_id, company_name, industry, 
    website, logo_url, description, 
    location, size, created_at
)

internships (
    id, company_id, title, description,
    responsibilities, duration_weeks,
    stipend_min, stipend_max, effort_hours_per_week,
    location_type (remote/onsite/hybrid),
    location, status (draft/active/closed),
    application_deadline, max_applicants,
    created_at, updated_at
)

internship_skills (
    id, internship_id, skill_id, 
    is_required (boolean), weight
)

internship_vectors (
    id, internship_id, vector (ARRAY[768]),
    model_version, created_at
)
```

#### 5.6 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/employers/profile` | Get company profile |
| PUT | `/employers/profile` | Update company profile |
| POST | `/employers/internships` | Create internship |
| GET | `/internships` | List internships (with filters) |
| GET | `/internships/{id}` | Get internship details |
| PUT | `/employers/internships/{id}` | Update internship |
| PATCH | `/employers/internships/{id}/status` | Change status |
| DELETE | `/employers/internships/{id}` | Delete internship |

---

### Module 6: AI Matching & Recommendation

#### 6.1 Business Scope
Recommend relevant internships to students based on skill alignment.

#### 6.2 Technical Tasks
| Task ID | Task | Priority | Complexity |
|---------|------|----------|------------|
| M6-T01 | Compare student skill vectors with posting vectors | High | High |
| M6-T02 | Compute cosine similarity match scores | High | Medium |
| M6-T03 | Rank recommendations by match score | High | Medium |
| M6-T04 | Generate match explanations (why matched) | Medium | Medium |
| M6-T05 | Identify skill gaps for each match | Medium | Medium |
| M6-T06 | Filter by student preferences | Medium | Low |
| M6-T07 | Real-time recommendation updates | Low | High |

#### 6.3 Outputs
- Ranked internship recommendations per student
- Match scores (0-100%)
- Skill gap analysis
- Match explanations

#### 6.4 Dependencies
- **Module 4**: Skill Extraction & Vectorization
- **Module 5**: Internship / Task Posting

#### 6.5 Database Entities
```sql
recommendations (
    id, student_id, internship_id, 
    match_score, skill_match_details (JSONB),
    skill_gaps (JSONB), created_at
)

applications (
    id, student_id, internship_id,
    status (pending/shortlisted/accepted/rejected),
    match_score, applied_at, updated_at
)
```

#### 6.6 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/students/recommendations` | Get recommendations |
| GET | `/students/recommendations/{id}/explain` | Get match explanation |
| POST | `/applications` | Apply to internship |
| GET | `/students/applications` | List my applications |
| GET | `/employers/internships/{id}/applicants` | List applicants |
| PATCH | `/applications/{id}/status` | Update application status |

#### 6.7 Matching Algorithm
```
┌─────────────────────────────────────────────────────────┐
│                  MATCHING ENGINE                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Retrieve student skill vector (768-dim)             │
│  2. Retrieve all active internship vectors              │
│  3. Compute cosine similarity for each pair             │
│  4. Apply filters (location, stipend, duration)         │
│  5. Rank by weighted score:                             │
│     score = 0.7 * skill_match + 0.2 * preference_match  │
│             + 0.1 * recency_boost                       │
│  6. Return top-N recommendations                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 6.8 Match Score Breakdown
| Component | Weight | Description |
|-----------|--------|-------------|
| Required Skills Match | 50% | % of required skills student has |
| Optional Skills Match | 20% | % of optional skills student has |
| Vector Similarity | 20% | Cosine similarity of embeddings |
| Preference Alignment | 10% | Location, stipend, duration match |

---

### Module 7: Internship Feedback & Completion

#### 7.1 Business Scope
Record internship completion and capture feedback from both sides.

#### 7.2 Technical Tasks
| Task ID | Task | Priority | Complexity |
|---------|------|----------|------------|
| M7-T01 | Mark internship as completed | High | Low |
| M7-T02 | Student feedback form (rating + comments) | High | Medium |
| M7-T03 | Company feedback form (rating + skills validated) | High | Medium |
| M7-T04 | Store ratings and comments | High | Low |
| M7-T05 | Calculate aggregate ratings | Medium | Low |
| M7-T06 | Skill verification by company | Medium | Medium |
| M7-T07 | Completion certificate generation | Low | Medium |

#### 7.3 Outputs
- Completion records
- Two-way feedback data
- Skill validations
- Company/student ratings

#### 7.4 Dependencies
- **Module 5**: Internship / Task Posting
- **Module 1**: User & Role Management

#### 7.5 Database Entities
```sql
internship_completions (
    id, application_id, student_id, internship_id,
    company_id, start_date, end_date,
    status (in_progress/completed/cancelled),
    hours_completed, completed_at
)

student_feedback (
    id, completion_id, student_id, internship_id,
    overall_rating (1-5), learning_rating,
    mentorship_rating, work_environment_rating,
    comments, would_recommend, submitted_at
)

company_feedback (
    id, completion_id, company_id, student_id,
    overall_rating (1-5), technical_rating,
    communication_rating, punctuality_rating,
    comments, would_hire, submitted_at
)

skill_validations (
    id, completion_id, student_id, skill_id,
    validated_by_company (boolean),
    proficiency_level (1-5), validated_at
)
```

#### 7.6 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/completions` | Mark internship complete |
| GET | `/completions/{id}` | Get completion details |
| POST | `/completions/{id}/student-feedback` | Submit student feedback |
| POST | `/completions/{id}/company-feedback` | Submit company feedback |
| GET | `/students/{id}/feedback` | Get student's received feedback |
| GET | `/employers/{id}/ratings` | Get company ratings |
| POST | `/completions/{id}/validate-skills` | Validate student skills |

---

### Module 8: ABC Credit Mapping & Credit Ledger

#### 8.1 Business Scope
Translate completed internships into formal academic credits (Activity-Based Credits).

#### 8.2 Technical Tasks
| Task ID | Task | Priority | Complexity |
|---------|------|----------|------------|
| M8-T01 | Define credit rules (admin interface) | High | Medium |
| M8-T02 | Map internship duration/type to credits | High | Medium |
| M8-T03 | Maintain credit ledger per student | High | Medium |
| M8-T04 | Auto-calculate credits on completion | High | Medium |
| M8-T05 | Credit transaction history | Medium | Low |
| M8-T06 | Credit balance dashboard | Medium | Low |
| M8-T07 | Export credit transcript | Low | Medium |

#### 8.3 Outputs
- Credit entries per completion
- Updated student credit balance
- Credit transaction history
- Exportable credit transcript

#### 8.4 Dependencies
- **Module 7**: Internship Feedback & Completion
- **Module 2**: Student Profile

#### 8.5 Database Entities
```sql
credit_rules (
    id, name, description,
    min_duration_weeks, max_duration_weeks,
    min_hours_per_week, credits_awarded,
    skill_category_bonus (JSONB),
    is_active, created_at
)

credit_ledger (
    id, student_id, completion_id,
    credits_awarded, rule_applied_id,
    calculation_details (JSONB),
    awarded_at
)

credit_summary (
    id, student_id, total_credits,
    credits_by_category (JSONB),
    last_updated
)
```

#### 8.6 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/credit-rules` | List credit rules |
| POST | `/admin/credit-rules` | Create credit rule |
| PUT | `/admin/credit-rules/{id}` | Update credit rule |
| GET | `/students/credits` | Get my credit balance |
| GET | `/students/credits/history` | Get credit transactions |
| GET | `/students/credits/transcript` | Generate transcript |

#### 8.7 Credit Calculation Rules (Example)
| Duration | Hours/Week | Base Credits | Skill Bonus |
|----------|------------|--------------|-------------|
| 4-8 weeks | 10-20 hrs | 2 credits | +0.5 for technical |
| 8-12 weeks | 20-30 hrs | 4 credits | +1.0 for technical |
| 12-16 weeks | 30-40 hrs | 6 credits | +1.5 for technical |
| 16+ weeks | 40+ hrs | 8 credits | +2.0 for technical |

---

## 4. Stakeholder Analysis

### 4.1 Student Persona

**Demographics**: College students (18-25), high digital proficiency, career anxiety

| Pain Point | Required Solution | Module |
|------------|-------------------|--------|
| Manual skill listing | AI-powered skill extraction | Module 4 |
| Finding relevant internships | Smart recommendations | Module 6 |
| No feedback on applications | Two-way feedback system | Module 7 |
| Academic credit tracking | ABC Credit Ledger | Module 8 |

### 4.2 Company Persona

**Demographics**: HR professionals, startup founders, hiring managers

| Pain Point | Required Solution | Module |
|------------|-------------------|--------|
| Skill-based filtering | Skill requirement posting | Module 5 |
| Finding matched candidates | AI matching engine | Module 6 |
| Validating intern skills | Skill validation system | Module 7 |

### 4.3 Admin Persona

**Demographics**: Platform administrators, academic coordinators

| Pain Point | Required Solution | Module |
|------------|-------------------|--------|
| Skill standardization | Skill taxonomy management | Module 3 |
| Credit policy management | Credit rule configuration | Module 8 |
| User management | Role-based access control | Module 1 |

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-P01 | Page load time | < 2 seconds | User experience |
| NFR-P02 | API response time | < 500ms (p95) | Real-time feel |
| NFR-P03 | CV text extraction | < 10 seconds | Acceptable wait |
| NFR-P04 | Recommendation generation | < 2 seconds | Fast matching |
| NFR-P05 | Concurrent users | 10,000+ | MVP scale |

### 5.2 Scalability Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-S01 | Horizontal scaling | Auto-scale at 70% CPU |
| NFR-S02 | Database connections | Connection pooling |
| NFR-S03 | Vector search | < 100ms for 100K vectors |

### 5.3 Availability & Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-A01 | System uptime | 99.9% |
| NFR-A02 | Data backup | Daily automated |
| NFR-A03 | Error rate | < 0.1% |

### 5.4 Security Requirements

| ID | Requirement | Standard |
|----|-------------|----------|
| NFR-SEC01 | Data encryption at rest | AES-256 |
| NFR-SEC02 | Data encryption in transit | TLS 1.3 |
| NFR-SEC03 | Authentication | JWT + OTP |
| NFR-SEC04 | Password storage | bcrypt |
| NFR-SEC05 | File upload validation | Type + size limits |

---

## 6. Technology Stack & Justification

### 6.1 Frontend Technologies

#### Web Application: **React + Vite**

| Criteria | Why React + Vite |
|----------|------------------|
| **Build Speed** | Vite's HMR is extremely fast (near-instant) |
| **Bundle Size** | Optimized production builds with tree-shaking |
| **Developer Experience** | React ecosystem, TypeScript support |
| **Simplicity** | SPA is sufficient for MVP (no SSR complexity) |
| **Flexibility** | Easy to migrate to Next.js later if SEO needed |

#### UI Component Library: **Tailwind CSS**

| Criteria | Justification |
|----------|---------------|
| **Utility-First** | Rapid UI development |
| **Customization** | Full design control via config |
| **Bundle Size** | PurgeCSS removes unused styles |
| **Responsive** | Built-in responsive utilities |

**Current Frontend Structure**:
```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.cjs
├── tsconfig.json
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/    # API calls to FastAPI
│   └── utils/
```

### 6.2 Backend Technologies

#### Unified Backend: **Python FastAPI**

| Criteria | Why FastAPI |
|----------|-------------|
| **Async Performance** | One of the fastest Python frameworks (on par with Node.js) |
| **Type Safety** | Pydantic models for automatic validation & serialization |
| **Auto Documentation** | Swagger/OpenAPI docs generated automatically |
| **ML Ecosystem** | Native Python: SpaCy, Sentence-Transformers, PyPDF2, NumPy |
| **Modern Python** | async/await, type hints, dataclasses |
| **Single Language** | No context switching between Node.js and Python |
| **ORM Support** | SQLAlchemy with async support |

**Why NOT Node.js + Python Split**:
- Eliminates inter-service communication overhead
- Single deployment unit simplifies DevOps
- All ML/AI operations native without HTTP calls
- Easier debugging and logging
- Reduced infrastructure complexity

**Current API Structure**:
```
FastAPI App
├── /auth          → Authentication & JWT
├── /students      → Student profiles & CV
├── /employers     → Company profiles & internships
├── /institutes    → Institute management
├── /skills        → Skill taxonomy (planned)
├── /matching      → AI recommendations (planned)
├── /feedback      → Completion & feedback (planned)
└── /credits       → ABC credit ledger (planned)
```

### 6.3 Database Technologies

#### Primary Database: **PostgreSQL**

| Criteria | Why PostgreSQL |
|----------|----------------|
| **ACID Compliance** | Data integrity |
| **Relational** | Complex entity relationships |
| **JSONB** | Flexible fields |
| **pgvector Extension** | Vector similarity search |

#### Vector Search: **pgvector (PostgreSQL Extension)**

| Criteria | Why pgvector |
|----------|--------------|
| **Integration** | No separate vector DB needed for MVP |
| **Cost** | Single database to manage |
| **Performance** | Sufficient for <100K vectors |
| **Simplicity** | SQL-based vector queries |

#### Caching: **Redis**

| Criteria | Why Redis |
|----------|-----------|
| **Speed** | In-memory, microsecond latency |
| **Sessions** | JWT token management |
| **Rate Limiting** | API protection |

### 6.4 Infrastructure

#### Cloud Provider: **AWS**

| Service | AWS Option | Purpose |
|---------|------------|---------|
| Compute | EC2 / ECS | Application hosting |
| Database | RDS PostgreSQL | Primary database |
| Storage | S3 | CV files, images |
| Cache | ElastiCache (Redis) | Caching |
| CDN | CloudFront | Static assets |

#### CI/CD: **GitHub Actions**

```
Code Push → Lint (ruff) → Test (pytest) → Build Docker → Push to ECR → Deploy to ECS
```

**Docker Setup**:
```dockerfile
# Dockerfile for FastAPI backend
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 6.5 Key Python Libraries & Tools

| Category | Library | Purpose |
|----------|---------|---------|
| **Web Framework** | FastAPI | Async REST API |
| **ASGI Server** | Uvicorn | High-performance server |
| **ORM** | SQLAlchemy 2.0 | Async database access |
| **Migrations** | Alembic | Database schema migrations |
| **Validation** | Pydantic | Request/response validation |
| **Auth** | python-jose, passlib | JWT tokens, password hashing |
| **CV Parsing** | PyPDF2, python-docx | Text extraction from CVs |
| **NLP** | SpaCy | Named Entity Recognition |
| **Embeddings** | Sentence-Transformers | Skill vectorization |
| **ML Model** | all-MiniLM-L6-v2 | 384-dim semantic vectors |
| **Vector Ops** | NumPy, scikit-learn | Cosine similarity |
| **File Storage** | boto3 | AWS S3 integration |
| **Email** | fastapi-mail | Email notifications |
| **Background Tasks** | Celery / FastAPI BackgroundTasks | Async job processing |
| **Testing** | pytest, httpx | API testing |

---

## 7. System Architecture

### 7.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                  React + Vite Web Application                       │
│              (Student Portal | Company Portal | Admin)              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY / NGINX                          │
│                    [SSL Termination] [Rate Limiting]                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PYTHON FASTAPI BACKEND                           │
│                        (Uvicorn ASGI)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │  /auth      │  │  /students  │  │  /employers │  │ /institutes ││
│  │  • Login    │  │  • Profile  │  │  • Profile  │  │ • Manage    ││
│  │  • Register │  │  • CV Upload│  │  • Postings │  │ • Students  ││
│  │  • JWT      │  │  • Skills   │  │  • Feedback │  │ • Reports   ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │  /skills    │  │  /matching  │  │  /feedback  │  │  /credits   ││
│  │  • Taxonomy │  │  • AI Match │  │  • Student  │  │  • Rules    ││
│  │  • Extract  │  │  • Recommend│  │  • Company  │  │  • Ledger   ││
│  │  • Vectorize│  │  • Rankings │  │  • Validate │  │  • Transcripts││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    INTERNAL SERVICES                            ││
│  │  • CV Parser (PyPDF2)      • Vectorizer (Sentence-Transformers) ││
│  │  • Skill Extractor (SpaCy) • Matcher (Cosine Similarity)        ││
│  └─────────────────────────────────────────────────────────────────┘│
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                  │
├──────────────────────────────┬──────────────────────────────────────┤
│   PostgreSQL (+ pgvector)    │              Redis                   │
│   • User data                │   • Sessions                         │
│   • Profiles                 │   • Cache                            │
│   • Internships              │   • Rate limits                      │
│   • Skills & Vectors         │   • Background job queues            │
│   • Applications             │                                      │
│   • Feedback & Credits       │                                      │
└──────────────────────────────┴──────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FILE STORAGE (S3)                             │
│                    • CV Documents (PDF/DOCX)                        │
│                    • Profile Photos                                 │
│                    • Company Logos                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 FastAPI Application Structure

```
PythonProject/
├── main.py                 # FastAPI app entry point
├── config.py               # Environment configuration
├── model.py                # SQLAlchemy models
├── data.py                 # Database session & connection
├── alembic.ini             # Migration configuration
│
├── api/
│   └── v1/
│       ├── auth.py         # Authentication routes
│       ├── students.py     # Student routes
│       ├── employers.py    # Employer routes
│       ├── institutes.py   # Institute routes
│       ├── skills.py       # Skill taxonomy routes (planned)
│       ├── matching.py     # AI matching routes (planned)
│       ├── feedback.py     # Feedback routes (planned)
│       └── credits.py      # Credit ledger routes (planned)
│
├── services/
│   ├── cv_parser.py        # CV text extraction
│   ├── skill_extractor.py  # NLP skill extraction
│   ├── vectorizer.py       # Embedding generation
│   └── matcher.py          # Recommendation engine
│
├── schemas/
│   ├── user.py             # Pydantic user schemas
│   ├── student.py          # Student schemas
│   ├── internship.py       # Internship schemas
│   └── ...
│
└── utils/
    ├── security.py         # JWT, password hashing
    ├── dependencies.py     # FastAPI dependencies
    └── exceptions.py       # Custom exceptions
```

### 7.3 Request Flow Example

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  NGINX   │────▶│  FastAPI │────▶│  Router  │
│  (React) │     │  Proxy   │     │  (main)  │     │ /students│
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                        │
     ┌──────────────────────────────────────────────────┘
     │
     ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Pydantic │────▶│ Service  │────▶│SQLAlchemy│────▶│PostgreSQL│
│ Validate │     │  Logic   │     │   ORM    │     │    DB    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │
     ▼
┌──────────┐
│  Return  │
│  JSON    │
└──────────┘
```

---

## 8. AI/ML Components

### 8.1 CV Text Extraction Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PDF/DOCX   │────▶│  PyPDF2 /   │────▶│  Clean &    │
│  Upload     │     │  python-docx│     │  Normalize  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Store Raw  │
                                        │  Text in DB │
                                        └─────────────┘
```

### 8.2 Skill Extraction Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Raw CV     │────▶│  SpaCy NER  │────▶│  Match to   │
│  Text       │     │  Processing │     │  Taxonomy   │
└─────────────┘     └────────
─────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Assign     │
                                        │  Confidence │
                                        └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Store      │
                                        │  Skills     │
                                        └─────────────┘
```

### 8.3 Vector Generation

**Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Speed**: Fast inference
- **Quality**: Good for semantic similarity

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

def generate_skill_vector(skills: list[str]) -> list[float]:
    skill_text = " ".join(skills)
    vector = model.encode(skill_text)
    return vector.tolist()  # 384-dim vector
```

### 8.4 Matching Algorithm

```python
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def compute_match_score(
    student_vector: list[float],
    internship_vector: list[float],
    student_skills: set[str],
    required_skills: set[str],
    optional_skills: set[str]
) -> dict:
    
    # Vector similarity (20%)
    vector_sim = cosine_similarity(
        [student_vector], 
        [internship_vector]
    )[0][0]
    
    # Required skills match (50%)
    required_match = len(student_skills & required_skills) / len(required_skills) if required_skills else 1.0
    
    # Optional skills match (20%)
    optional_match = len(student_skills & optional_skills) / len(optional_skills) if optional_skills else 1.0
    
    # Final score
    score = (
        0.50 * required_match +
        0.20 * optional_match +
        0.20 * vector_sim +
        0.10  # Base score
    ) * 100
    
    return {
        "match_score": round(score, 2),
        "required_match": round(required_match * 100, 2),
        "optional_match": round(optional_match * 100, 2),
        "vector_similarity": round(vector_sim * 100, 2),
        "skill_gaps": list(required_skills - student_skills)
    }
```

---

## 9. Security & Compliance

### 9.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                 AUTHENTICATION FLOW                      │
├─────────────────────────────────────────────────────────┤
│  1. User enters email/phone                              │
│  2. OTP sent via SMS/Email                               │
│  3. OTP verified → JWT issued                            │
│     • Access Token: 15 minutes                           │
│     • Refresh Token: 7 days                              │
│  4. Role assigned (student/company/admin)                │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Role-Based Access Control

| Endpoint Pattern | Student | Company | Admin |
|------------------|---------|---------|-------|
| `/students/*` | ✅ Own | ❌ | ✅ |
| `/employers/*` | ❌ | ✅ Own | ✅ |
| `/institutes/*` | ❌ | ❌ | ✅ |
| `/internships` (GET) | ✅ | ✅ | ✅ |
| `/internships` (POST) | ❌ | ✅ | ✅ |
| `/applications` | ✅ Own | ✅ Own | ✅ |
| `/admin/*` | ❌ | ❌ | ✅ |

**FastAPI Dependency for Auth**:
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    # Decode JWT and return user
    ...

async def require_role(roles: list[str]):
    async def role_checker(user = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return role_checker
```

### 9.3 Data Protection

| Data Type | Protection | Python Library |
|-----------|------------|----------------|
| Passwords | bcrypt hash (12 rounds) | `passlib[bcrypt]` |
| JWT Tokens | HS256/RS256 signed | `python-jose` |
| CV Files | S3 private bucket, signed URLs | `boto3` |
| PII Fields | Encrypted at rest | PostgreSQL TDE |
| API Traffic | TLS 1.3 | NGINX/Uvicorn |

**Password Hashing Example**:
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

---

## 10. Database Schema

### 10.1 Complete Schema (PostgreSQL)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ==================== MODULE 1: Users ====================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'company', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE otp_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== MODULE 2: Student Profiles ====================

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    location VARCHAR(255),
    bio TEXT,
    profile_photo_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(100) NOT NULL,
    branch VARCHAR(100),
    cgpa DECIMAL(3,2),
    start_year INTEGER,
    end_year INTEGER,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cv_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(20),
    file_size INTEGER,
    raw_text TEXT,
    is_primary BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ==================== MODULE 3: Skill Taxonomy ====================

CREATE TABLE skill_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES skill_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category_id, name)
);

CREATE TABLE skill_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    synonym VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== MODULE 4: Student Skills ====================

CREATE TABLE student_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id),
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    source VARCHAR(20) CHECK (source IN ('cv_extracted', 'manual', 'verified')),
    extracted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, skill_id)
);

CREATE TABLE student_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE REFERENCES student_profiles(id) ON DELETE CASCADE,
    skill_vector vector(384),  -- pgvector type
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== MODULE 5: Companies & Internships ====================

CREATE TABLE company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    website VARCHAR(500),
    logo_url VARCHAR(500),
    description TEXT,
    location VARCHAR(255),
    founded_year INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    responsibilities TEXT,
    duration_weeks INTEGER,
    stipend_min INTEGER,
    stipend_max INTEGER,
    effort_hours_per_week INTEGER,
    location_type VARCHAR(20) CHECK (location_type IN ('remote', 'onsite', 'hybrid')),
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
    application_deadline DATE,
    max_applicants INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE internship_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id),
    is_required BOOLEAN DEFAULT TRUE,
    weight DECIMAL(3,2) DEFAULT 1.0,
    UNIQUE(internship_id, skill_id)
);

CREATE TABLE internship_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internship_id UUID UNIQUE REFERENCES internships(id) ON DELETE CASCADE,
    skill_vector vector(384),
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== MODULE 6: Applications ====================

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),
    match_score DECIMAL(5,2),
    match_details JSONB,
    cover_letter TEXT,
    applied_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, internship_id)
);

-- ==================== MODULE 7: Completions & Feedback ====================

CREATE TABLE internship_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID UNIQUE REFERENCES applications(id),
    student_id UUID REFERENCES student_profiles(id),
    internship_id UUID REFERENCES internships(id),
    company_id UUID REFERENCES company_profiles(id),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'in_progress' 
        CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    hours_completed INTEGER,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE student_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    completion_id UUID UNIQUE REFERENCES internship_completions(id),
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    learning_rating INTEGER CHECK (learning_rating BETWEEN 1 AND 5),
    mentorship_rating INTEGER CHECK (mentorship_rating BETWEEN 1 AND 5),
    work_environment_rating INTEGER CHECK (work_environment_rating BETWEEN 1 AND 5),
    comments TEXT,
    would_recommend BOOLEAN,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE company_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    completion_id UUID UNIQUE REFERENCES internship_completions(id),
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    technical_rating INTEGER CHECK (technical_rating BETWEEN 1 AND 5),
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    punctuality_rating INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
    comments TEXT,
    would_hire BOOLEAN,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE skill_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    completion_id UUID REFERENCES internship_completions(id),
    student_id UUID REFERENCES student_profiles(id),
    skill_id UUID REFERENCES skills(id),
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
    validated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(completion_id, skill_id)
);

-- ==================== MODULE 8: Credits ====================

CREATE TABLE credit_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    min_duration_weeks INTEGER,
    max_duration_weeks INTEGER,
    min_hours_per_week INTEGER,
    credits_awarded DECIMAL(3,1) NOT NULL,
    skill_category_bonus JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES student_profiles(id),
    completion_id UUID REFERENCES internship_completions(id),
    credits_awarded DECIMAL(4,1) NOT NULL,
    rule_applied_id UUID REFERENCES credit_rules(id),
    calculation_details JSONB,
    awarded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credit_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE REFERENCES student_profiles(id),
    total_credits DECIMAL(5,1) DEFAULT 0,
    credits_by_category JSONB,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- ==================== INDEXES ====================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_student_profiles_user ON student_profiles(user_id);
CREATE INDEX idx_skills_category ON skills(category_id);
CREATE INDEX idx_student_skills_student ON student_skills(student_id);
CREATE INDEX idx_internships_company ON internships(company_id);
CREATE INDEX idx_internships_status ON internships(status);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_internship ON applications(internship_id);
CREATE INDEX idx_completions_student ON internship_completions(student_id);
CREATE INDEX idx_credit_ledger_student ON credit_ledger(student_id);

-- Vector similarity index (for matching)
CREATE INDEX idx_student_vectors ON student_vectors 
    USING ivfflat (skill_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_internship_vectors ON internship_vectors 
    USING ivfflat (skill_vector vector_cosine_ops) WITH (lists = 100);
```

---

## 11. API Specifications

### 11.1 Authentication APIs (FastAPI)

```python
# Pydantic Schemas
from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    email: EmailStr
    phone: str
    password: str
    role: str  # student | employer | admin

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
```

```yaml
# Register User
POST /auth/register
Content-Type: application/json

Request:
{
  "email": "student@example.com",
  "phone": "+919876543210",
  "password": "SecurePass123!",
  "role": "student"
}

Response: 201 Created
{
  "message": "OTP sent to phone",
  "user_id": "uuid"
}

# Login
POST /auth/login
Content-Type: application/x-www-form-urlencoded

Request: username=email&password=pass

Response: 200 OK
{
  "access_token": "jwt...",
  "refresh_token": "jwt...",
  "token_type": "bearer"
}

# Get Current User
GET /auth/me
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "uuid",
  "email": "student@example.com",
  "role": "student",
  "is_verified": true
}
```

### 11.2 Student Profile APIs

```python
# Pydantic Schemas
class StudentProfileUpdate(BaseModel):
    full_name: str
    dob: date | None
    location: str | None
    bio: str | None

class StudentProfileResponse(BaseModel):
    id: UUID
    full_name: str
    profile_score: int
```

```yaml
# Update Profile
PUT /students/profile
Authorization: Bearer <token>

Request:
{
  "full_name": "John Doe",
  "dob": "2000-05-15",
  "location": "Bangalore",
  "bio": "Aspiring software developer..."
}

Response: 200 OK
{
  "id": "uuid",
  "full_name": "John Doe",
  "profile_score": 65
}

# Upload CV
POST /students/cv/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Request: file (PDF/DOCX, max 5MB)

Response: 201 Created
{
  "cv_id": "uuid",
  "file_name": "resume.pdf",
  "extracted_skills": ["Python", "React", "Machine Learning"],
  "skill_count": 12
}
```

### 11.3 Internship APIs

```python
# Pydantic Schemas
class InternshipCreate(BaseModel):
    title: str
    description: str
    duration_weeks: int
    stipend_min: int
    stipend_max: int
    location_type: str  # remote | onsite | hybrid
    location: str | None
    required_skills: list[UUID]
    optional_skills: list[UUID] = []
```

```yaml
# Create Internship
POST /employers/internships
Authorization: Bearer <token> (employer)

Request:
{
  "title": "Software Engineering Intern",
  "description": "Work on cutting-edge ML projects...",
  "duration_weeks": 12,
  "stipend_min": 15000,
  "stipend_max": 25000,
  "location_type": "hybrid",
  "location": "Bangalore",
  "required_skills": ["uuid1", "uuid2"],
  "optional_skills": ["uuid3"]
}

Response: 201 Created
{
  "id": "uuid",
  "title": "Software Engineering Intern",
  "status": "draft"
}

# Get Recommendations (Student)
GET /students/recommendations?limit=10
Authorization: Bearer <token>

Response: 200 OK
{
  "recommendations": [
    {
      "internship": {
        "id": "uuid",
        "title": "ML Intern",
        "company": "TechCorp",
        "stipend": "₹20,000-30,000"
      },
      "match_score": 87.5,
      "match_details": {
        "required_match": 80,
        "optional_match": 100,
        "vector_similarity": 85
      },
      "skill_gaps": ["TensorFlow"]
    }
  ],
  "total_matches": 45
}
```

### 11.4 Feedback & Credits APIs

```python
# Pydantic Schemas
class CompanyFeedback(BaseModel):
    overall_rating: int = Field(ge=1, le=5)
    technical_rating: int = Field(ge=1, le=5)
    communication_rating: int = Field(ge=1, le=5)
    punctuality_rating: int = Field(ge=1, le=5)
    comments: str | None
    would_hire: bool
    validated_skills: list[dict]
```

```yaml
# Submit Company Feedback
POST /completions/{id}/company-feedback
Authorization: Bearer <token> (employer)

Request:
{
  "overall_rating": 4,
  "technical_rating": 5,
  "communication_rating": 4,
  "punctuality_rating": 5,
  "comments": "Excellent work ethic...",
  "would_hire": true,
  "validated_skills": [
    { "skill_id": "uuid1", "proficiency_level": 4 },
    { "skill_id": "uuid2", "proficiency_level": 5 }
  ]
}

Response: 201 Created
{
  "feedback_id": "uuid",
  "credits_awarded": 4.5,
  "total_credits": 12.5
}

# Get Credit Summary
GET /students/credits
Authorization: Bearer <token>

Response: 200 OK
{
  "total_credits": 12.5,
  "credits_by_category": {
    "technical": 8.0,
    "soft_skills": 2.5,
    "domain": 2.0
  },
  "recent_transactions": [
    {
      "internship": "ML Intern at TechCorp",
      "credits": 4.5,
      "date": "2026-01-15"
    }
  ]
}
```

---

## 12. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CV parsing accuracy | Medium | High | Use multiple extraction methods, manual correction |
| Skill taxonomy coverage | Medium | Medium | Start with core skills, expand iteratively |
| Matching quality | Medium | High | A/B testing, feedback loop for improvement |
| Cold start (few users) | High | High | Partner with colleges, seed data |
| Vector DB performance | Low | Medium | pgvector sufficient for MVP, migrate later if needed |
| Credit rule complexity | Medium | Low | Start simple, add rules based on feedback |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Project Team | Initial release |
| 2.0 | Jan 2026 | Project Team | Restructured for MVP modules |

---

## Appendix: Drop-wise Task Breakdown

### Drop 1 (Yellow - Due: 28-Jan-2026)

| Module | Task | Assignee | Status |
|--------|------|----------|--------|
| M1 | User registration | TBD | ⬜ Pending |
| M1 | Login + OTP | TBD | ⬜ Pending |
| M1 | JWT auth middleware | TBD | ⬜ Pending |
| M1 | RBAC implementation | TBD | ⬜ Pending |
| M2 | Profile form UI | TBD | ⬜ Pending |
| M2 | Profile API | TBD | ⬜ Pending |
| M2 | CV upload | TBD | ⬜ Pending |
| M2 | Text extraction | TBD | ⬜ Pending |
| M3 | Skill categories setup | TBD | ⬜ Pending |
| M3 | Initial skill dataset | TBD | ⬜ Pending |
| M3 | Admin skill CRUD | TBD | ⬜ Pending |

### Drop 2 (Green)

| Module | Task | Assignee | Status |
|--------|------|----------|--------|
| M4 | Skill extraction NLP | TBD | ⬜ Pending |
| M4 | Taxonomy matching | TBD | ⬜ Pending |
| M4 | Vector generation | TBD | ⬜ Pending |
| M5 | Company profile | TBD | ⬜ Pending |
| M5 | Internship posting | TBD | ⬜ Pending |
| M5 | Skill requirements UI | TBD | ⬜ Pending |
| M6 | Matching algorithm | TBD | ⬜ Pending |
| M6 | Recommendations API | TBD | ⬜ Pending |
| M6 | Application flow | TBD | ⬜ Pending |

### Drop 3 (Red)

| Module | Task | Assignee | Status |
|--------|------|----------|--------|
| M7 | Completion marking | TBD | ⬜ Pending |
| M7 | Student feedback form | TBD | ⬜ Pending |
| M7 | Company feedback form | TBD | ⬜ Pending |
| M7 | Skill validation | TBD | ⬜ Pending |
| M8 | Credit rules admin | TBD | ⬜ Pending |
| M8 | Credit calculation | TBD | ⬜ Pending |
| M8 | Credit ledger | TBD | ⬜ Pending |
| M8 | Credit transcript | TBD | ⬜ Pending |

---

*This document serves as the foundational blueprint for Praktiki. All stakeholders should review and approve before development commences.*
