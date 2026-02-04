-- Sample data insertion script for internships

-- First, let's check if we have any employer profiles
-- If not, we'll create a minimal one for testing
INSERT OR IGNORE INTO employer_profiles (id, user_id, company_name, contact_number) VALUES 
(1, 1, 'TechCorp', '9876543210');

-- Create sample skills
INSERT OR IGNORE INTO skills (name) VALUES 
('Python'), ('JavaScript'), ('React'), ('Node.js'), ('FastAPI'), ('SQL'),
('Java'), ('C++'), ('Machine Learning'), ('Data Science'), ('HTML'), ('CSS');

-- Create sample internships
INSERT OR IGNORE INTO internships (title, description, location, mode, duration_weeks, employer_id) VALUES
('Software Development Intern', 'Work on cutting-edge software projects using Python and FastAPI.', 'Bangalore', 'remote', 12, 1),
('Frontend Development Intern', 'Build responsive web applications using React and JavaScript.', 'Mumbai', 'hybrid', 10, 1),
('Data Science Intern', 'Analyze data and build machine learning models.', 'Remote', 'remote', 16, 1),
('Java Developer Intern', 'Develop enterprise applications using Java.', 'Delhi', 'office', 8, 1);

-- Link skills to internships
-- First, get the skill IDs
INSERT OR IGNORE INTO internship_skills (internship_id, skill_id) VALUES
-- Software Development Intern (Python, FastAPI, SQL)
(1, (SELECT id FROM skills WHERE name = 'Python')),
(1, (SELECT id FROM skills WHERE name = 'FastAPI')),
(1, (SELECT id FROM skills WHERE name = 'SQL')),
-- Frontend Development Intern (React, JavaScript, CSS)
(2, (SELECT id FROM skills WHERE name = 'React')),
(2, (SELECT id FROM skills WHERE name = 'JavaScript')),
(2, (SELECT id FROM skills WHERE name = 'CSS')),
-- Data Science Intern (Python, Machine Learning, Data Science)
(3, (SELECT id FROM skills WHERE name = 'Python')),
(3, (SELECT id FROM skills WHERE name = 'Machine Learning')),
(3, (SELECT id FROM skills WHERE name = 'Data Science')),
-- Java Developer Intern (Java, SQL)
(4, (SELECT id FROM skills WHERE name = 'Java')),
(4, (SELECT id FROM skills WHERE name = 'SQL'));