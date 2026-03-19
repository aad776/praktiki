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
SPACY_MODEL = "en_core_web_md"  # Using medium model for better performance and reliability
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

# Industry-Standard Skill Aliases mapping canonical skills to all variants, acronyms, and misspellings
SKILL_ALIASES: Dict[str, List[str]] = {
    "React": ["reactjs", "react.js", "react js"],
    "Vue": ["vuejs", "vue.js", "vue js"],
    "Node.js": ["node", "nodejs", "node.js", "node js", "node-js"],
    "Express.js": ["express", "expressjs", "express.js", "express js"],
    "PostgreSQL": ["postgres", "postgre sql", "postgresql", "psql"],
    "MongoDB": ["mongo", "mongodb"],
    "Kubernetes": ["k8s", "kube", "kubernetes", "microk8s"],
    "AWS": ["aws", "amazon web services", "aws ec2"],
    "GCP": ["gcp", "google cloud platform", "google cloud"],
    "Machine Learning": ["ml", "machine learning"],
    "Artificial Intelligence": ["ai", "artificial intelligence"],
    "CSS": ["css", "css3"],
    "HTML": ["html", "html5"],
    "JavaScript": ["js", "es6", "javascript", "java script"],
    "TypeScript": ["ts", "typescript", "type script"],
    "Python": ["py", "python3", "python"],
    "C++": ["cpp", "c plus plus", "c/c++"],
    "C#": ["csharp", "c sharp"],
    "Go": ["golang"],
    "Ruby": ["ruby on rails", "ror"], # Optional context mapping
    "React Native": ["react-native", "react native"],
    "Next.js": ["nextjs", "next js", "next.js"],
    "Nuxt.js": ["nuxtjs", "nuxt js", "nuxt.js"],
    "Tailwind CSS": ["tailwind", "tailwindcss", "tailwind css"]
}

# Hierarchical Skill Taxonomy for inference (Ontology)
SKILL_ONTOLOGY: Dict[str, Dict[str, List[str]]] = {
    "React": {
        "language": ["JavaScript", "TypeScript"],
        "domain": ["Web Development", "Frontend"],
        "parent": ["Frontend Framework"],
        "equivalents": ["Angular", "Vue"]
    },
    "Angular": {
        "language": ["TypeScript", "JavaScript"],
        "domain": ["Web Development", "Frontend"],
        "parent": ["Frontend Framework"],
        "equivalents": ["React", "Vue"]
    },
    "Vue": {
        "language": ["JavaScript", "TypeScript"],
        "domain": ["Web Development", "Frontend"],
        "parent": ["Frontend Framework"],
        "equivalents": ["React", "Angular"]
    },
    "Django": {
        "language": ["Python"],
        "domain": ["Web Development", "Backend"],
        "parent": ["Backend Framework"],
        "equivalents": ["Flask", "FastAPI"]
    },
    "FastAPI": {
        "language": ["Python"],
        "domain": ["Web Development", "Backend", "API Development"],
        "parent": ["Backend Framework"],
        "equivalents": ["Django", "Flask"]
    },
    "Flask": {
        "language": ["Python"],
        "domain": ["Web Development", "Backend"],
        "parent": ["Backend Framework"],
        "equivalents": ["Django", "FastAPI"]
    },
    "Node.js": {
        "language": ["JavaScript"],
        "domain": ["Web Development", "Backend"],
        "parent": ["Runtime Environment"],
        "equivalents": ["Deno", "Bun"]
    },
    "Express.js": {
        "language": ["JavaScript"],
        "domain": ["Web Development", "Backend", "API Development"],
        "parent": ["Backend Framework"],
        "equivalents": ["Koa", "NestJS"]
    },
    "Spring Boot": {
        "language": ["Java"],
        "domain": ["Web Development", "Backend"],
        "parent": ["Backend Framework"],
        "equivalents": ["Micronaut", "Quarkus"]
    },
    "Ruby on Rails": {
        "language": ["Ruby"],
        "domain": ["Web Development", "Backend"],
        "parent": ["Backend Framework"],
        "equivalents": ["Django", "Laravel"]
    },
    "Laravel": {
        "language": ["PHP"],
        "domain": ["Web Development", "Backend"],
        "parent": ["Backend Framework"],
        "equivalents": ["Symfony", "Ruby on Rails"]
    },
    "Docker": {
        "domain": ["DevOps", "Containerization"],
        "parent": ["Containerization Tool"],
        "equivalents": ["Podman"]
    },
    "Kubernetes": {
        "domain": ["DevOps", "Container Orchestration"],
        "parent": ["Container Orchestration Tool"],
        "equivalents": ["Docker Swarm", "Nomad"]
    },
    "TensorFlow": {
        "language": ["Python"],
        "domain": ["Data Science", "Machine Learning", "Deep Learning"],
        "parent": ["Machine Learning Framework"],
        "equivalents": ["PyTorch", "Keras"]
    },
    "PyTorch": {
        "language": ["Python"],
        "domain": ["Data Science", "Machine Learning", "Deep Learning"],
        "parent": ["Machine Learning Framework"],
        "equivalents": ["TensorFlow", "Keras"]
    },
    "AWS": {
        "domain": ["Cloud Computing"],
        "parent": ["Cloud Provider"],
        "equivalents": ["GCP", "Azure"]
    },
    "GCP": {
        "domain": ["Cloud Computing"],
        "parent": ["Cloud Provider"],
        "equivalents": ["AWS", "Azure"]
    },
    "Azure": {
        "domain": ["Cloud Computing"],
        "parent": ["Cloud Provider"],
        "equivalents": ["AWS", "GCP"]
    },
    "Pandas": {
        "language": ["Python"],
        "domain": ["Data Science", "Data Analysis"],
        "parent": ["Data Analysis Library"],
        "equivalents": ["Polars", "Dask"]
    },
    "PostgreSQL": {
        "domain": ["Database Management", "Backend"],
        "parent": ["Relational Database"],
        "equivalents": ["MySQL", "MariaDB", "Oracle"]
    },
    "MySQL": {
        "domain": ["Database Management", "Backend"],
        "parent": ["Relational Database"],
        "equivalents": ["PostgreSQL", "MariaDB", "Oracle"]
    },
    "MongoDB": {
        "domain": ["Database Management", "Backend"],
        "parent": ["NoSQL Database"],
        "equivalents": ["DynamoDB", "CouchDB", "Cassandra"]
    },
}

# FAISS Configuration
FAISS_SIMILARITY_THRESHOLD = 0.75  # Minimum cosine similarity for skill matching

# Entity Extraction Configuration
MAX_NAME_WORDS = 4  # Maximum words in a person's name
MIN_NAME_WORDS = 2  # Minimum words to consider as a name

# Logging
logger = logging.getLogger(__name__)
