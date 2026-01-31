from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from db.session import Base


class InternshipSkill(Base):
    __tablename__ = "internship_skills"

    id = Column(Integer, primary_key=True, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)

    __table_args__ = (UniqueConstraint('internship_id', 'skill_id', name='_intern_skill_uc'),)