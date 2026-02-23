"""
Unified Skill Graph -- single source of truth for the entire matching pipeline.

Three-level hierarchy:  Domain -> Category -> Skill
Also provides synonym resolution, tech stack detection, and hierarchy distance.

Phase-1: Static / in-memory.  A DB-backed version can wrap this later.
"""

from __future__ import annotations

from typing import Dict, FrozenSet, List, Optional, Set, Tuple


# ---------------------------------------------------------------------------
# Hierarchy:  domain  ->  category  ->  [skills]
# ---------------------------------------------------------------------------

DOMAIN_HIERARCHY: Dict[str, Dict[str, List[str]]] = {
    "Web Development": {
        "Frontend": [
            "React", "Angular", "Vue", "Svelte", "Next.js", "Nuxt.js",
            "HTML", "CSS", "SCSS", "SASS", "Tailwind CSS", "Bootstrap",
            "jQuery", "Redux", "Webpack", "Vite",
        ],
        "Backend": [
            "Node.js", "Express.js", "Django", "Flask", "FastAPI",
            "Spring Boot", "ASP.NET", "Ruby on Rails", "Laravel",
            "Symfony", "NestJS",
        ],
    },
    "Data Science": {
        "Machine Learning": [
            "Scikit-learn", "XGBoost", "LightGBM",
        ],
        "Deep Learning": [
            "TensorFlow", "PyTorch", "Keras",
        ],
        "NLP": [
            "spaCy", "NLTK", "Hugging Face", "RAG", "LLM Fine-tuning",
        ],
        "Computer Vision": [
            "OpenCV", "YOLO",
        ],
        "Data Analysis": [
            "Pandas", "NumPy", "Matplotlib", "Statistics", "Data Analysis",
        ],
    },
    "DevOps": {
        "Containerization": [
            "Docker", "Kubernetes", "Podman",
        ],
        "CI/CD": [
            "Jenkins", "GitHub Actions", "GitLab CI", "CircleCI", "Travis CI",
        ],
        "Cloud": [
            "AWS", "Azure", "Google Cloud", "Terraform", "Ansible",
        ],
    },
    "Databases": {
        "Relational": [
            "PostgreSQL", "MySQL", "SQLite", "Oracle", "MariaDB",
            "Microsoft SQL Server",
        ],
        "NoSQL": [
            "MongoDB", "Redis", "Cassandra", "DynamoDB", "Firebase",
        ],
        "Search": [
            "Elasticsearch",
        ],
    },
    "Mobile Development": {
        "Cross-Platform": [
            "React Native", "Flutter", "Xamarin",
        ],
        "Native": [
            "iOS", "Swift", "Android", "Kotlin",
        ],
    },
    "Programming Languages": {
        "Languages": [
            "Python", "JavaScript", "TypeScript", "Java", "C++", "C#",
            "Go", "Rust", "Ruby", "PHP", "Scala", "R", "MATLAB", "Perl",
        ],
    },
    "Tools & Methodologies": {
        "Version Control": [
            "Git", "GitHub", "GitLab", "Bitbucket",
        ],
        "Project Management": [
            "Jira", "Confluence", "Agile", "Scrum",
        ],
        "OS & Scripting": [
            "Linux", "Unix", "Bash", "Shell Scripting",
        ],
        "Architecture": [
            "REST API", "GraphQL", "Microservices", "CI/CD",
            "Test-Driven Development", "Object-Oriented Programming",
            "Functional Programming",
        ],
        "Servers": [
            "Nginx", "Apache",
        ],
    },
    "Design & Analytics": {
        "Design": [
            "Figma", "Sketch", "Photoshop",
        ],
        "Analytics": [
            "Power BI", "Tableau", "Excel", "VBA",
        ],
        "Platforms": [
            "WordPress", "Shopify", "Salesforce", "SAP",
        ],
    },
}


# ---------------------------------------------------------------------------
# Synonym map  (lowercased variant -> canonical name)
# ---------------------------------------------------------------------------

SYNONYMS: Dict[str, str] = {
    # Python
    "py": "Python",
    "python3": "Python",
    "python 3": "Python",
    "cpython": "Python",
    # JavaScript
    "js": "JavaScript",
    "es6": "JavaScript",
    "es2015": "JavaScript",
    "ecmascript": "JavaScript",
    "vanilla js": "JavaScript",
    # TypeScript
    "ts": "TypeScript",
    # Java
    "java se": "Java",
    "java ee": "Java",
    "core java": "Java",
    # C++
    "cpp": "C++",
    "c plus plus": "C++",
    # C#
    "csharp": "C#",
    "c sharp": "C#",
    # Go
    "golang": "Go",
    # Rust
    "rustlang": "Rust",
    # React
    "react.js": "React",
    "reactjs": "React",
    "react js": "React",
    # Angular
    "angularjs": "Angular",
    "angular.js": "Angular",
    "angular js": "Angular",
    # Vue
    "vue.js": "Vue",
    "vuejs": "Vue",
    "vue js": "Vue",
    # Svelte
    "sveltejs": "Svelte",
    "svelte.js": "Svelte",
    # Next.js
    "nextjs": "Next.js",
    "next js": "Next.js",
    "next.js": "Next.js",
    # Nuxt.js
    "nuxtjs": "Nuxt.js",
    "nuxt js": "Nuxt.js",
    "nuxt.js": "Nuxt.js",
    # Node.js
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node js": "Node.js",
    # Express.js
    "express": "Express.js",
    "expressjs": "Express.js",
    "express.js": "Express.js",
    # NestJS
    "nestjs": "NestJS",
    "nest.js": "NestJS",
    "nest js": "NestJS",
    # Django
    "django rest framework": "Django",
    "drf": "Django",
    # Flask
    "flask api": "Flask",
    # Spring Boot
    "spring": "Spring Boot",
    "spring framework": "Spring Boot",
    # Databases
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "pg": "PostgreSQL",
    "mysql db": "MySQL",
    "mongo": "MongoDB",
    "mongodb": "MongoDB",
    "mongo db": "MongoDB",
    "dynamodb": "DynamoDB",
    "dynamo db": "DynamoDB",
    "redis cache": "Redis",
    "mssql": "Microsoft SQL Server",
    "sql server": "Microsoft SQL Server",
    "mariadb": "MariaDB",
    "maria db": "MariaDB",
    # DevOps / Cloud
    "k8s": "Kubernetes",
    "kube": "Kubernetes",
    "aws ec2": "AWS",
    "amazon web services": "AWS",
    "azure cloud": "Azure",
    "microsoft azure": "Azure",
    "gcp": "Google Cloud",
    "google cloud platform": "Google Cloud",
    # ML / Data Science
    "ml": "Machine Learning",
    "ai": "Machine Learning",
    "artificial intelligence": "Machine Learning",
    "dl": "Deep Learning",
    "deep neural network": "Deep Learning",
    "dnn": "Deep Learning",
    "tf": "TensorFlow",
    "tensorflow 2": "TensorFlow",
    "sklearn": "Scikit-learn",
    "scikit learn": "Scikit-learn",
    "sci-kit learn": "Scikit-learn",
    "nlp": "NLP",
    "natural language processing": "NLP",
    "cv": "Computer Vision",
    "computer vision": "Computer Vision",
    "rag": "RAG",
    "retrieval augmented generation": "RAG",
    "llm": "LLM Fine-tuning",
    "large language model": "LLM Fine-tuning",
    "huggingface": "Hugging Face",
    "hugging face": "Hugging Face",
    "hf": "Hugging Face",
    "xgb": "XGBoost",
    "lgbm": "LightGBM",
    "light gbm": "LightGBM",
    # Frontend misc
    "html5": "HTML",
    "css3": "CSS",
    "sass": "SASS",
    "scss": "SCSS",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    # Tools
    "ci cd": "CI/CD",
    "ci/cd": "CI/CD",
    "github actions": "GitHub Actions",
    "gh actions": "GitHub Actions",
    "gitlab ci": "GitLab CI",
    "gitlab ci/cd": "GitLab CI",
    "tdd": "Test-Driven Development",
    "oop": "Object-Oriented Programming",
    "fp": "Functional Programming",
    "rest": "REST API",
    "restful": "REST API",
    "restful api": "REST API",
    "graphql api": "GraphQL",
    # Mobile
    "react native": "React Native",
    "rn": "React Native",
    "ios development": "iOS",
    "android development": "Android",
    # SQL (generic)
    "sql": "SQL",
}


# ---------------------------------------------------------------------------
# Tech stack bundles
# ---------------------------------------------------------------------------

TECH_STACKS: Dict[str, FrozenSet[str]] = {
    "MERN": frozenset({"MongoDB", "Express.js", "React", "Node.js"}),
    "MEAN": frozenset({"MongoDB", "Express.js", "Angular", "Node.js"}),
    "MEVN": frozenset({"MongoDB", "Express.js", "Vue", "Node.js"}),
    "LAMP": frozenset({"Linux", "Apache", "MySQL", "PHP"}),
    "Django Stack": frozenset({"Python", "Django", "PostgreSQL"}),
    "Flask Stack": frozenset({"Python", "Flask", "PostgreSQL"}),
    "FastAPI Stack": frozenset({"Python", "FastAPI", "PostgreSQL"}),
    "Spring Stack": frozenset({"Java", "Spring Boot", "PostgreSQL"}),
    "Rails Stack": frozenset({"Ruby", "Ruby on Rails", "PostgreSQL"}),
    "ML Stack": frozenset({"Python", "Scikit-learn", "Pandas", "NumPy"}),
    "DL Stack": frozenset({"Python", "TensorFlow", "PyTorch", "NumPy"}),
    "React Native Stack": frozenset({"JavaScript", "React Native", "Node.js"}),
    "Flutter Stack": frozenset({"Flutter", "Dart"}),
}


# ---------------------------------------------------------------------------
# Partial-credit weights for hierarchy matching
# ---------------------------------------------------------------------------

EXACT_MATCH_CREDIT = 1.0
CHILD_MATCH_CREDIT = 0.7   # student has child, job wants parent/category
SIBLING_MATCH_CREDIT = 0.5 # same category, different skill
PARENT_MATCH_CREDIT = 0.3  # student has parent/category, job wants child
DOMAIN_MATCH_CREDIT = 0.2  # same domain, different category


# ============================================================================
# SkillGraph
# ============================================================================

class SkillGraph:
    """
    In-memory skill graph built from the static hierarchy above.

    Provides:
    - normalize(raw_name)           -> canonical skill name
    - get_parent(skill)             -> category name | None
    - get_domain(skill)             -> domain name  | None
    - get_siblings(skill)           -> set of skills in the same category
    - get_children(category)        -> set of skills under a category
    - detect_stacks(skills)         -> list of matched tech-stack names
    - hierarchy_distance(a, b)      -> 0..3
    - hierarchy_credit(a, b)        -> float (partial credit)
    - all_canonical_skills()        -> full set of canonical skill names
    """

    def __init__(self) -> None:
        # skill (lower) -> canonical name
        self._canonical: Dict[str, str] = {}
        # canonical -> category
        self._skill_to_category: Dict[str, str] = {}
        # canonical -> domain
        self._skill_to_domain: Dict[str, str] = {}
        # category -> set of canonical skills
        self._category_children: Dict[str, Set[str]] = {}
        # domain -> set of categories
        self._domain_categories: Dict[str, Set[str]] = {}

        self._build(DOMAIN_HIERARCHY)
        self._load_synonyms(SYNONYMS)

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    def _build(self, hierarchy: Dict[str, Dict[str, List[str]]]) -> None:
        for domain, categories in hierarchy.items():
            self._domain_categories[domain] = set()
            for category, skills in categories.items():
                self._domain_categories[domain].add(category)
                self._category_children.setdefault(category, set())
                for skill in skills:
                    canon = skill
                    self._canonical[skill.lower()] = canon
                    self._skill_to_category[canon] = category
                    self._skill_to_domain[canon] = domain
                    self._category_children[category].add(canon)

    def _load_synonyms(self, synonyms: Dict[str, str]) -> None:
        for variant, canon in synonyms.items():
            self._canonical[variant.lower()] = canon

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def normalize(self, raw: str) -> str:
        """Return canonical skill name, or the input title-cased if unknown."""
        key = raw.lower().strip()
        return self._canonical.get(key, raw)

    def get_parent(self, skill: str) -> Optional[str]:
        """Category that *skill* belongs to (or None)."""
        canon = self.normalize(skill)
        return self._skill_to_category.get(canon)

    def get_domain(self, skill: str) -> Optional[str]:
        """Top-level domain for *skill* (or None)."""
        canon = self.normalize(skill)
        return self._skill_to_domain.get(canon)

    def get_siblings(self, skill: str) -> Set[str]:
        """Other skills in the same category (excluding *skill* itself)."""
        cat = self.get_parent(skill)
        if cat is None:
            return set()
        canon = self.normalize(skill)
        return self._category_children.get(cat, set()) - {canon}

    def get_children(self, category: str) -> Set[str]:
        """All skills that belong to *category*."""
        return set(self._category_children.get(category, set()))

    def detect_stacks(self, skills: Set[str]) -> List[str]:
        """Return tech-stack names fully covered by *skills*."""
        normalized = {self.normalize(s) for s in skills}
        matched: List[str] = []
        for stack_name, required in TECH_STACKS.items():
            if required <= normalized:
                matched.append(stack_name)
        return sorted(matched)

    def hierarchy_distance(self, a: str, b: str) -> int:
        """
        0 = same canonical skill
        1 = siblings  (same category)
        2 = same domain, different category
        3 = unrelated / unknown
        """
        ca, cb = self.normalize(a), self.normalize(b)
        if ca == cb:
            return 0
        cat_a, cat_b = self.get_parent(ca), self.get_parent(cb)
        if cat_a and cat_a == cat_b:
            return 1
        dom_a, dom_b = self.get_domain(ca), self.get_domain(cb)
        if dom_a and dom_a == dom_b:
            return 2
        return 3

    def hierarchy_credit(self, student_skill: str, required_skill: str) -> float:
        """
        Partial credit a student earns toward *required_skill* by having
        *student_skill*.

        Returns a float in [0, 1].
        """
        cs = self.normalize(student_skill)
        cr = self.normalize(required_skill)

        if cs == cr:
            return EXACT_MATCH_CREDIT

        cat_s = self.get_parent(cs)
        cat_r = self.get_parent(cr)

        # Student has a specific tool, job requires the category / broader
        # skill.  e.g. student: PyTorch, job: Deep Learning.
        if cat_s and cat_s == cr:
            return CHILD_MATCH_CREDIT
        # Student has a broad skill, job requires a specific tool.
        # e.g. student: Machine Learning, job: Scikit-learn
        if cat_r and cs == cat_r:
            return PARENT_MATCH_CREDIT

        # Sibling: same category, different skill.
        if cat_s and cat_s == cat_r:
            return SIBLING_MATCH_CREDIT

        # Same domain but different categories.
        dom_s = self.get_domain(cs)
        dom_r = self.get_domain(cr)
        if dom_s and dom_s == dom_r:
            return DOMAIN_MATCH_CREDIT

        return 0.0

    def all_canonical_skills(self) -> List[str]:
        """Sorted list of every canonical skill name in the hierarchy."""
        return sorted(
            {v for v in self._canonical.values()}
            | set(self._skill_to_category.keys())
        )

    def get_synonym_map(self) -> Dict[str, str]:
        """Full lowered-variant -> canonical map (for resume parser compat)."""
        return dict(self._canonical)


# Module-level singleton for convenience imports.
_graph: Optional[SkillGraph] = None


def get_skill_graph() -> SkillGraph:
    """Return (or create) the module-level SkillGraph singleton."""
    global _graph
    if _graph is None:
        _graph = SkillGraph()
    return _graph
