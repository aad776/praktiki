import random
import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import models
from models.user import User
from models.employer_profile import EmployerProfile
from models.internship import Internship
from models.student_profile import StudentProfile
from models.skill import Skill
from models.internship_skills import InternshipSkill
from models.student_skills import StudentSkill

# Database connection
engine = create_engine('sqlite:///./test.db')
Session = sessionmaker(bind=engine)
db = Session()

# Predefined data for random selection
DEPARTMENTS = [
    'Computer Science', 'Information Technology', 'Electronics', 'Mechanical',
    'Civil', 'Electrical', 'Chemical', 'Biotechnology', 'Aerospace',
    'Architecture', 'Business Administration', 'Economics', 'Finance',
    'Marketing', 'Human Resources', 'Psychology', 'Sociology', 'Mathematics',
    'Physics', 'Chemistry', 'Biology'
]

COURSES = {
    'Computer Science': ['B.Tech', 'BE', 'M.Tech', 'MCA'],
    'Information Technology': ['B.Tech', 'BE', 'M.Tech'],
    'Electronics': ['B.Tech', 'BE', 'M.Tech'],
    'Mechanical': ['B.Tech', 'BE', 'M.Tech'],
    'Civil': ['B.Tech', 'BE', 'M.Tech'],
    'Electrical': ['B.Tech', 'BE', 'M.Tech'],
    'Chemical': ['B.Tech', 'BE', 'M.Tech'],
    'Biotechnology': ['B.Tech', 'B.Sc', 'M.Tech', 'M.Sc'],
    'Aerospace': ['B.Tech', 'BE', 'M.Tech'],
    'Architecture': ['B.Arch', 'M.Arch'],
    'Business Administration': ['BBA', 'MBA'],
    'Economics': ['BA', 'MA', 'B.Sc', 'M.Sc'],
    'Finance': ['B.Com', 'M.Com', 'MBA'],
    'Marketing': ['BBA', 'MBA', 'B.Com'],
    'Human Resources': ['BBA', 'MBA', 'BA'],
    'Psychology': ['BA', 'MA'],
    'Sociology': ['BA', 'MA'],
    'Mathematics': ['B.Sc', 'M.Sc'],
    'Physics': ['B.Sc', 'M.Sc'],
    'Chemistry': ['B.Sc', 'M.Sc'],
    'Biology': ['B.Sc', 'M.Sc']
}

SKILLS = [
    'Python', 'JavaScript', 'React', 'Node.js', 'FastAPI', 'SQL', 'Java', 'C++',
    'Machine Learning', 'Data Science', 'HTML', 'CSS', 'Git', 'Docker', 'AWS',
    'Azure', 'Google Cloud', 'Django', 'Flask', 'Spring Boot', 'Angular', 'Vue.js',
    'TypeScript', 'PHP', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Kubernetes',
    'DevOps', 'UI/UX Design', 'Graphic Design', 'Digital Marketing', 'SEO',
    'Content Writing', 'Social Media Marketing', 'Google Analytics', 'Excel',
    'Power BI', 'Tableau', 'Financial Analysis', 'Project Management',
    'Agile', 'Scrum', 'Leadership', 'Communication', 'Teamwork', 'Problem Solving',
    'Time Management', 'Critical Thinking', 'Creativity', 'Adaptability'
]

INTERNSHIP_FIELDS = [
    'Software Development', 'Web Development', 'Mobile Development',
    'Data Science', 'Machine Learning', 'DevOps', 'Cloud Computing',
    'UI/UX Design', 'Digital Marketing', 'Content Writing', 'Graphic Design',
    'Finance', 'Accounting', 'Human Resources', 'Business Development',
    'Sales', 'Product Management', 'Project Management', 'Research',
    'Engineering', 'Architecture', 'Biotechnology', 'Analytics'
]

LOCATIONS = [
    'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune',
    'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Indore',
    'Remote', 'Hybrid'
]

MODES = ['remote', 'onsite', 'hybrid']

# Step 1: Create employer user
print("Creating employer profile...")
employer_email = "employer@example.com"
employer_password = "password123"

# Check if employer already exists
existing_employer = db.query(User).filter(User.email == employer_email).first()
if existing_employer:
    print("Employer already exists, skipping...")
    employer_user = existing_employer
else:
    hashed_password = bcrypt.hashpw(employer_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    employer_user = User(
        email=employer_email,
        full_name="TechCorp Employer",
        hashed_password=hashed_password,
        role="employer",
        is_email_verified=True
    )
    db.add(employer_user)
    db.commit()
    db.refresh(employer_user)

# Create employer profile if not exists
employer_profile = db.query(EmployerProfile).filter(EmployerProfile.user_id == employer_user.id).first()
if not employer_profile:
    employer_profile = EmployerProfile(
        user_id=employer_user.id,
        company_name="TechCorp Solutions",
        contact_number="9876543210"
    )
    db.add(employer_profile)
    db.commit()
    db.refresh(employer_profile)

# Step 2: Create skills if not already present
print("Creating skills...")
for skill_name in SKILLS:
    skill = db.query(Skill).filter(Skill.name == skill_name).first()
    if not skill:
        skill = Skill(name=skill_name)
        db.add(skill)
db.commit()

# Get all skills for later use
all_skills = db.query(Skill).all()
skill_dict = {skill.name: skill.id for skill in all_skills}

# Step 3: Generate 200 internships
print("Generating 200 internships...")
for i in range(200):
    field = random.choice(INTERNSHIP_FIELDS)
    title = f"{field} Intern"
    description = f"Join our team as a {field} Intern and gain hands-on experience in a dynamic environment."
    location = random.choice(LOCATIONS)
    mode = random.choice(MODES)
    duration = random.randint(4, 24)  # 4-24 weeks
    
    # Create internship
    internship = Internship(
        employer_id=employer_profile.id,
        title=title,
        description=description,
        location=location,
        mode=mode,
        duration_weeks=duration
    )
    db.add(internship)
    db.commit()
    db.refresh(internship)
    
    # Assign 2-5 random skills to each internship
    num_skills = random.randint(2, 5)
    selected_skills = random.sample(SKILLS, num_skills)
    for skill_name in selected_skills:
        skill_id = skill_dict[skill_name]
        internship_skill = InternshipSkill(
            internship_id=internship.id,
            skill_id=skill_id
        )
        db.add(internship_skill)
    db.commit()

# Step 4: Generate 20 students
print("Generating 20 students...")
student_credentials = []

for i in range(20):
    # Generate student details
    dept = random.choice(DEPARTMENTS)
    course = random.choice(COURSES[dept])
    year = random.randint(1, 4)
    
    # Generate email (student1@example.com, student2@example.com, etc.)
    student_email = f"student{i+1}@example.com"
    # Password from 1 to 8 (cycle through)
    student_password = str((i % 8) + 1)
    student_credentials.append(f"Email: {student_email}, Password: {student_password}")
    
    # Create student user
    hashed_password = bcrypt.hashpw(student_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    student_user = User(
        email=student_email,
        full_name=f"Student {i+1}",
        hashed_password=hashed_password,
        role="student",
        is_email_verified=True
    )
    db.add(student_user)
    db.commit()
    db.refresh(student_user)
    
    # Create student profile
    # Select 3-5 skills for the student
    num_skills = random.randint(3, 5)
    student_skills = random.sample(SKILLS, num_skills)
    skills_str = ", ".join(student_skills)
    
    # Select 2-3 interests
    num_interests = random.randint(2, 3)
    interests = random.sample(INTERNSHIP_FIELDS, num_interests)
    interests_str = ", ".join(interests)
    
    student_profile = StudentProfile(
        user_id=student_user.id,
        university_name=f"University {random.randint(1, 50)}",
        department=dept,
        year=year,
        skills=skills_str,
        interests=interests_str,
        is_apaar_verified=True
    )
    db.add(student_profile)
    db.commit()
    db.refresh(student_profile)
    
    # Link skills to student
    for skill_name in student_skills:
        skill_id = skill_dict[skill_name]
        student_skill = StudentSkill(
            student_id=student_profile.id,
            skill_id=skill_id
        )
        db.add(student_skill)
    db.commit()

# Print student credentials
print("\nStudent Credentials:")
for cred in student_credentials:
    print(cred)

# Close database connection
db.close()

print("\nDummy data generation complete!")
print(f"Created: 1 Employer, 200 Internships, 20 Students")