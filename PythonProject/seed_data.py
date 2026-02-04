from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.internship import Internship
from models.employer_profile import EmployerProfile
from models.skill import Skill
from models.internship_skills import InternshipSkill

# Create database connection
engine = create_engine('sqlite:///./test.db')
Session = sessionmaker(bind=engine)
db = Session()

# Check if there are any employer profiles
employer = db.query(EmployerProfile).first()

# If no employer profiles exist, skip this script since we can't create a valid employer without a user
if not employer:
    print("No employer profiles found. Please create an employer profile first.")
    db.close()
    exit()

# Create sample skills
skills = [
    "Python", "JavaScript", "React", "Node.js", "FastAPI", "SQL",
    "Java", "C++", "Machine Learning", "Data Science", "HTML", "CSS"
]

for skill_name in skills:
    skill = db.query(Skill).filter(Skill.name == skill_name).first()
    if not skill:
        skill = Skill(name=skill_name)
        db.add(skill)
db.commit()

# Create sample internships
internships = [
    {
        "title": "Software Development Intern",
        "description": "Work on cutting-edge software projects using Python and FastAPI.",
        "location": "Bangalore",
        "mode": "remote",
        "duration_weeks": 12,
        "employer_id": employer.id,
        "skills": ["Python", "FastAPI", "SQL"]
    },
    {
        "title": "Frontend Development Intern",
        "description": "Build responsive web applications using React and JavaScript.",
        "location": "Mumbai",
        "mode": "hybrid",
        "duration_weeks": 10,
        "employer_id": employer.id,
        "skills": ["React", "JavaScript", "CSS"]
    },
    {
        "title": "Data Science Intern",
        "description": "Analyze data and build machine learning models.",
        "location": "Remote",
        "mode": "remote",
        "duration_weeks": 16,
        "employer_id": employer.id,
        "skills": ["Python", "Machine Learning", "Data Science"]
    },
    {
        "title": "Java Developer Intern",
        "description": "Develop enterprise applications using Java.",
        "location": "Delhi",
        "mode": "office",
        "duration_weeks": 8,
        "employer_id": employer.id,
        "skills": ["Java", "SQL"]
    }
]

# Add internships to database
for internship_data in internships:
    skills = internship_data.pop("skills")
    internship = Internship(**internship_data)
    db.add(internship)
    db.commit()
    db.refresh(internship)
    
    # Add skills to internship
    for skill_name in skills:
        skill = db.query(Skill).filter(Skill.name == skill_name).first()
        if skill:
            internship_skill = InternshipSkill(
                internship_id=internship.id,
                skill_id=skill.id
            )
            db.add(internship_skill)
db.commit()

print(f"Added {len(internships)} internships to the database.")
db.close()