from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from db.session import Base


class StudentSkill(Base):
    __tablename__ = "student_skills"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)

    # Taki ek student ek hi skill baar baar add na kare
    __table_args__ = (UniqueConstraint('student_id', 'skill_id', name='_student_skill_uc'),)