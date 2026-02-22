"""
Configuration module for Resume Parser
Centralized settings for models, patterns, and skill taxonomy
"""
import re
from typing import List, Dict
import logging

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Model Configuration
SPACY_MODEL = "en_core_web_trf"  # Transformer-based model for high accuracy
SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"  # Lightweight embedding model
FAISS_INDEX_DIM = 384  # Embedding dimension for MiniLM

# File Upload Configuration
MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = {".pdf"}

# Regex Patterns
EMAIL_PATTERN = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
)

PHONE_PATTERN = re.compile(
    r'(?:(?:\+|00)\d{1,3}[\s.-]?)?'  # Country code
    r'(?:\(?\d{1,4}\)?[\s.-]?)?'     # Area code
    r'\d{3,4}[\s.-]?\d{3,4}'         # Main number
)

# Experience extraction patterns
YEAR_RANGE_PATTERN = re.compile(
    r'(?:19|20)\d{2}\s*[-–—to]\s*(?:(?:19|20)\d{2}|Present|Current|Now)',
    re.IGNORECASE
)

MONTH_YEAR_PATTERN = re.compile(
    r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
    r'\s*(?:19|20)\d{2}',
    re.IGNORECASE
)

# Comprehensive Skill Taxonomy (50+ skills)
SKILL_LIST: List[str] = [
    # Programming Languages
    "Python", "JavaScript", "Java", "C++", "C#", "Go", "TypeScript", "Ruby",
    "PHP", "Swift", "Kotlin", "Rust", "Scala", "R", "MATLAB", "Perl",
    
    # Frontend Technologies
    "React", "Angular", "Vue.js", "Vue", "HTML", "CSS", "SCSS", "SASS",
    "jQuery", "Bootstrap", "Tailwind CSS", "Next.js", "Nuxt.js", "Svelte",
    "Redux", "Webpack", "Vite",
    
    # Backend Technologies
    "Node.js", "Express.js", "Django", "Flask", "FastAPI", "Spring Boot",
    "ASP.NET", "Ruby on Rails", "Laravel", "Symfony", "NestJS",
    
    # Databases
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Oracle",
    "Microsoft SQL Server", "Cassandra", "DynamoDB", "Elasticsearch",
    "MariaDB", "Firebase",
    
    # DevOps & Cloud
    "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "GCP",
    "Terraform", "Ansible", "Jenkins", "GitLab CI", "GitHub Actions",
    "CircleCI", "Travis CI", "Nginx", "Apache",
    
    # Data Science & ML
    "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "Keras",
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
    "Data Analysis", "Statistics",
    
    # Tools & Methodologies
    "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence",
    "Linux", "Unix", "Bash", "Shell Scripting", "Agile", "Scrum",
    "REST API", "GraphQL", "Microservices", "CI/CD", "Test-Driven Development",
    "Object-Oriented Programming", "Functional Programming",
    
    # Mobile Development
    "React Native", "Flutter", "iOS", "Android", "Xamarin",
    
    # Other
    "WordPress", "Shopify", "Salesforce", "SAP", "Power BI", "Tableau",
    "Excel", "VBA", "Photoshop", "Figma", "Sketch"
]

# Skill normalization mapping (variations to canonical form)
SKILL_NORMALIZATION: Dict[str, str] = {
    "react.js": "React",
    "reactjs": "React",
    "vue.js": "Vue",
    "vuejs": "Vue",
    "node": "Node.js",
    "nodejs": "Node.js",
    "express": "Express.js",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mongodb": "MongoDB",
    "mongo": "MongoDB",
    "k8s": "Kubernetes",
    "aws ec2": "AWS",
    "amazon web services": "AWS",
    "google cloud platform": "GCP",
    "ml": "Machine Learning",
    "ai": "Machine Learning",
    "css3": "CSS",
    "html5": "HTML",
    "es6": "JavaScript",
    "js": "JavaScript",
    "ts": "TypeScript",
    "py": "Python",
}

# FAISS Configuration
FAISS_SIMILARITY_THRESHOLD = 0.75  # Minimum cosine similarity for skill matching

# Entity Extraction Configuration
MAX_NAME_WORDS = 4  # Maximum words in a person's name
MIN_NAME_WORDS = 2  # Minimum words to consider as a name

# Logging
logger = logging.getLogger(__name__)
