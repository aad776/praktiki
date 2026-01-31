def build_student_text(student) -> str:
    return (
        f"Student skills: {', '.join(student.skills)}. "
        f"Year: {student.year}. "
        f"Location: {student.location}."
    )


def build_internship_text(internship) -> str:
    return (
        f"Internship requires skills: {', '.join(internship.required_skills)}. "
        f"Minimum year: {internship.min_year}. "
        f"Location: {internship.location}. "
        f"Remote: {internship.is_remote}."
    )
