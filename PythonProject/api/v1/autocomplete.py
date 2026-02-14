from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from db.session import get_db
from models.skill import Skill
from models.college import College
from models.course import Course
from models.stream import Stream, Specialization
from models.area_of_interest import AreaOfInterest
from pydantic import BaseModel

router = APIRouter()

class AutocompleteItem(BaseModel):
    id: int
    name: str

@router.get("/skills", response_model=List[AutocompleteItem])
def autocomplete_skills(q: str = Query("", min_length=0), db: Session = Depends(get_db)):
    skills = db.query(Skill).filter(Skill.name.ilike(f"%{q}%")).limit(10).all()
    return [AutocompleteItem(id=s.id, name=s.name) for s in skills]

@router.get("/colleges", response_model=List[AutocompleteItem])
def autocomplete_colleges(
    q: str = Query("", min_length=0), 
    course_id: Optional[int] = Query(None),
    course_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(College)
    if q:
        query = query.filter(College.name.ilike(f"%{q}%"))
    
    if course_id:
        query = query.join(College.courses).filter(Course.id == course_id)
    elif course_name:
        query = query.join(College.courses).filter(Course.name == course_name)
        
    colleges = query.limit(10).all()
    return [AutocompleteItem(id=c.id, name=c.name) for c in colleges]

@router.get("/courses", response_model=List[AutocompleteItem])
def autocomplete_courses(q: str = Query("", min_length=0), db: Session = Depends(get_db)):
    courses = db.query(Course).filter(Course.name.ilike(f"%{q}%")).limit(10).all()
    return [AutocompleteItem(id=c.id, name=c.name) for c in courses]

@router.get("/streams", response_model=List[AutocompleteItem])
def autocomplete_streams(
    q: str = Query("", min_length=0),
    course_id: Optional[int] = Query(None),
    course_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Stream)
    if q:
        query = query.filter(Stream.name.ilike(f"%{q}%"))
    
    if course_id:
        query = query.filter(Stream.course_id == course_id)
    elif course_name:
        query = query.join(Stream.course).filter(Course.name == course_name)
        
    streams = query.distinct().limit(10).all()
    return [AutocompleteItem(id=s.id, name=s.name) for s in streams]

@router.get("/specializations", response_model=List[AutocompleteItem])
def autocomplete_specializations(
    q: str = Query("", min_length=0),
    stream_id: Optional[int] = Query(None),
    stream_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Specialization)
    if q:
        query = query.filter(Specialization.name.ilike(f"%{q}%"))
    
    if stream_id:
        query = query.filter(Specialization.stream_id == stream_id)
    elif stream_name:
        query = query.join(Specialization.stream).filter(Stream.name == stream_name)
        
    specs = query.distinct().limit(10).all()
    return [AutocompleteItem(id=s.id, name=s.name) for s in specs]

@router.get("/areas-of-interest", response_model=List[AutocompleteItem])
def autocomplete_areas_of_interest(
    q: str = Query("", min_length=0),
    stream_name: Optional[str] = Query(None),
    course_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(AreaOfInterest)
    if q:
        query = query.filter(AreaOfInterest.name.ilike(f"%{q}%"))
    
    if stream_name:
        # Check if stream exists and has mapping
        query_filtered = query.join(AreaOfInterest.stream).filter(Stream.name == stream_name)
        if query_filtered.count() > 0:
            query = query_filtered
    if course_name:
        query_filtered = query.join(AreaOfInterest.course).filter(Course.name == course_name)
        if query_filtered.count() > 0:
            query = query_filtered
            
    areas = query.distinct().limit(10).all()
    return [AutocompleteItem(id=a.id, name=a.name) for a in areas]
