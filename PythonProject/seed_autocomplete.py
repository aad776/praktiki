from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.college import College
from models.course import Course
from models.skill import Skill
from models.stream import Stream, Specialization
from models.area_of_interest import AreaOfInterest
import os

# Create database connection
engine = create_engine('sqlite:///./test.db')
Session = sessionmaker(bind=engine)
db = Session()

def seed_skills():
    # Massive list of skills categorized by course relevance
    skills_map = {
        "Engineering/IT": [
            "Python", "JavaScript", "React", "Node.js", "FastAPI", "SQL", "Java", "C++", 
            "Machine Learning", "Data Science", "HTML", "CSS", "TypeScript", "Angular", 
            "Vue.js", "Django", "Flask", "Spring Boot", "Docker", "Kubernetes", "AWS", 
            "Azure", "Google Cloud", "Flutter", "React Native", "Swift", "Kotlin", "Go", 
            "Rust", "PHP", "Laravel", "Ruby on Rails", "C#", ".NET", "MongoDB", "PostgreSQL", 
            "Redis", "Elasticsearch", "UI/UX Design", "Figma", "Adobe XD", "Photoshop",
            "Git", "Jenkins", "CI/CD", "Deep Learning", "NLP", "Computer Vision",
            "Cybersecurity", "Ethical Hacking", "Blockchain", "Solidity", "TensorFlow",
            "PyTorch", "Cuda", "R Programming", "Tableau", "PowerBI", "SAS"
        ],
        "Management/Commerce": [
            "Financial Accounting", "Corporate Finance", "Investment Banking", "Tally",
            "GST", "Income Tax", "Business Analytics", "Market Research", "Digital Marketing",
            "SEO", "SEM", "Social Media Marketing", "Content Marketing", "Email Marketing",
            "HR Management", "Organizational Behavior", "Supply Chain Management",
            "Operations Management", "Project Management", "Agile", "Scrum", "Excel",
            "Public Speaking", "Negotiation", "Sales", "Customer Relationship Management (CRM)"
        ],
        "Medical/Bio": [
            "Anatomy", "Physiology", "Biochemistry", "Pathology", "Microbiology",
            "Pharmacology", "Clinical Research", "Bioinformatics", "Genetics",
            "Molecular Biology", "Biotechnology", "Healthcare Management"
        ],
        "Design/Arts": [
            "Graphic Design", "Illustration", "Typography", "Motion Graphics",
            "Video Editing", "Adobe Premiere Pro", "After Effects", "Maya", "3ds Max",
            "Blender", "Fashion Design", "Interior Design", "Creative Writing",
            "Photography", "Journalism"
        ]
    }
    
    total_skills = 0
    for category, skills in skills_map.items():
        for name in skills:
            if not db.query(Skill).filter(Skill.name == name).first():
                db.add(Skill(name=name))
                total_skills += 1
    db.commit()
    print(f"Seeded {total_skills} new skills")

def seed_courses():
    courses = [
        {"name": "B.Tech", "level": "UG"},
        {"name": "M.Tech", "level": "PG"},
        {"name": "BCA", "level": "UG"},
        {"name": "MCA", "level": "PG"},
        {"name": "B.Sc", "level": "UG"},
        {"name": "M.Sc", "level": "PG"},
        {"name": "MBA", "level": "PG"},
        {"name": "BBA", "level": "UG"},
        {"name": "B.Com", "level": "UG"},
        {"name": "M.Com", "level": "PG"},
        {"name": "B.A.", "level": "UG"},
        {"name": "M.A.", "level": "PG"},
        {"name": "MBBS", "level": "UG"},
        {"name": "B.Arch", "level": "UG"},
        {"name": "B.Des", "level": "UG"},
        {"name": "LLB", "level": "UG"},
        {"name": "LLM", "level": "PG"},
        {"name": "B.Ed", "level": "UG"},
        {"name": "B.Pharma", "level": "UG"},
        {"name": "M.Pharma", "level": "PG"}
    ]
    for c in courses:
        if not db.query(Course).filter(Course.name == c["name"]).first():
            db.add(Course(name=c["name"], level=c["level"]))
    db.commit()
    print(f"Seeded {len(courses)} courses")

def seed_streams_and_specializations():
    # Common streams for mapping
    stream_specs = {
        "Computer Science": ["AI & ML", "Data Science", "Cybersecurity", "Cloud Computing", "Full Stack Development"],
        "Electronics": ["VLSI", "Embedded Systems", "Robotics", "IoT"],
        "Mechanical": ["Automobile", "Mechatronics", "Thermal Engineering", "Manufacturing"],
        "Civil": ["Structural Engineering", "Transportation", "Environmental Engineering"],
        "Management": ["Finance", "Marketing", "Human Resources", "Operations", "International Business"],
        "Science": ["Physics", "Chemistry", "Mathematics", "Biology", "Biotechnology"],
        "Commerce": ["Accounting", "Auditing", "Banking", "Insurance"],
        "Arts": ["English", "History", "Psychology", "Sociology", "Economics"]
    }
    
    # Get some courses to link streams
    btech = db.query(Course).filter(Course.name == "B.Tech").first()
    bcom = db.query(Course).filter(Course.name == "B.Com").first()
    mba = db.query(Course).filter(Course.name == "MBA").first()
    
    courses_to_seed = [btech, bcom, mba]
    
    for course in courses_to_seed:
        if not course: continue
        for s_name, specs in stream_specs.items():
            # Only add relevant streams per course for a cleaner start
            stream = db.query(Stream).filter(Stream.name == s_name, Stream.course_id == course.id).first()
            if not stream:
                stream = Stream(name=s_name, course_id=course.id)
                db.add(stream)
                db.flush()
            
            for spec_name in specs:
                if not db.query(Specialization).filter(Specialization.name == spec_name, Specialization.stream_id == stream.id).first():
                    db.add(Specialization(name=spec_name, stream_id=stream.id))

    db.commit()
    print("Seeded massive streams and specializations")

def seed_colleges():
    # Comprehensive list of Indian Colleges
    colleges_list = [
        # IITs
        "Indian Institute of Technology (IIT) Bombay", "Indian Institute of Technology (IIT) Delhi",
        "Indian Institute of Technology (IIT) Madras", "Indian Institute of Technology (IIT) Kanpur",
        "Indian Institute of Technology (IIT) Kharagpur", "Indian Institute of Technology (IIT) Roorkee",
        "Indian Institute of Technology (IIT) Guwahati", "Indian Institute of Technology (IIT) Hyderabad",
        "Indian Institute of Technology (IIT) Indore", "Indian Institute of Technology (IIT) BHU Varanasi",
        "Indian Institute of Technology (IIT) Ropar", "Indian Institute of Technology (IIT) Bhubaneswar",
        "Indian Institute of Technology (IIT) Gandhinagar", "Indian Institute of Technology (IIT) Patna",
        # NITs
        "National Institute of Technology (NIT) Trichy", "National Institute of Technology (NIT) Surathkal",
        "National Institute of Technology (NIT) Rourkela", "National Institute of Technology (NIT) Warangal",
        "National Institute of Technology (NIT) Calicut", "National Institute of Technology (NIT) Kurukshetra",
        "National Institute of Technology (NIT) Durgapur", "National Institute of Technology (NIT) Silchar",
        "National Institute of Technology (NIT) Hamirpur", "National Institute of Technology (NIT) Jamshedpur",
        # IIITs
        "Indian Institute of Information Technology (IIIT) Allahabad", "Indian Institute of Information Technology (IIIT) Gwalior",
        "Indian Institute of Information Technology (IIIT) Jabalpur", "Indian Institute of Information Technology (IIIT) Kancheepuram",
        "International Institute of Information Technology (IIIT) Hyderabad", "International Institute of Information Technology (IIIT) Bangalore",
        # Universities
        "Delhi University (DU)", "Jawaharlal Nehru University (JNU)", "Banaras Hindu University (BHU)",
        "Anna University", "Jadavpur University", "University of Mumbai", "University of Calcutta",
        "Savitribai Phule Pune University", "Manipal Academy of Higher Education", "BITS Pilani",
        "VIT University, Vellore", "SRM Institute of Science and Technology", "Amity University",
        "Lovely Professional University (LPU)", "Chandigarh University", "Thapar Institute",
        "Delhi Technological University (DTU)", "Netaji Subhas University of Technology (NSUT)",
        "Hindustan Institute of Technology", "Shiv Nadar University", "Ashoka University",
        "Symbiosis International University", "Christ University", "OP Jindal Global University"
    ]
    
    for name in colleges_list:
        if not db.query(College).filter(College.name == name).first():
            db.add(College(name=name))
                
    db.commit()
    print(f"Seeded {len(colleges_list)} Indian colleges")

def seed_areas_of_interest():
    interests = [
        "Software Development", "Web Development", "Mobile App Development", "Data Science", 
        "Artificial Intelligence", "Machine Learning", "Cyber Security", "Cloud Computing", 
        "Digital Marketing", "Content Writing", "Graphic Design", "Video Editing", 
        "Finance", "HR Management", "Sales", "Business Analytics", "UI/UX Design",
        "Product Management", "Operations", "Supply Chain", "Investment Banking",
        "Consulting", "Teaching", "Research", "Entrepreneurship"
    ]
    for name in interests:
        if not db.query(AreaOfInterest).filter(AreaOfInterest.name == name).first():
            db.add(AreaOfInterest(name=name))
    db.commit()
    print(f"Seeded {len(interests)} areas of interest")

if __name__ == "__main__":
    seed_skills()
    seed_courses()
    seed_streams_and_specializations()
    seed_colleges()
    seed_areas_of_interest()
    db.close()
