from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.college import College
from models.course import Course
from models.stream import Stream, Specialization
from models.area_of_interest import AreaOfInterest
import os

engine = create_engine('sqlite:///./test.db')
Session = sessionmaker(bind=engine)
db = Session()

def seed_advanced():
    # 1. Clear existing data to avoid conflicts if needed, but let's just use get_or_create logic
    
    def get_or_create(model, **kwargs):
        instance = db.query(model).filter_by(**kwargs).first()
        if not instance:
            instance = model(**kwargs)
            db.add(instance)
            db.commit()
            db.refresh(instance)
        return instance

    # Courses
    btech = get_or_create(Course, name="B.Tech", level="UG")
    mtech = get_or_create(Course, name="M.Tech", level="PG")
    bca = get_or_create(Course, name="BCA", level="UG")
    mca = get_or_create(Course, name="MCA", level="PG")
    mba = get_or_create(Course, name="MBA", level="PG")
    bba = get_or_create(Course, name="BBA", level="UG")
    bsc = get_or_create(Course, name="B.Sc", level="UG")
    msc = get_or_create(Course, name="M.Sc", level="PG")

    # Colleges and their courses
    iits = db.query(College).filter(College.name.ilike("%Indian Institute of Technology%")).all()
    for iit in iits:
        if btech not in iit.courses: iit.courses.append(btech)
        if mtech not in iit.courses: iit.courses.append(mtech)
        db.commit()

    nits = db.query(College).filter(College.name.ilike("%National Institute of Technology%")).all()
    for nit in nits:
        if btech not in nit.courses: nit.courses.append(btech)
        if mtech not in nit.courses: nit.courses.append(mtech)
        db.commit()

    du = db.query(College).filter(College.name == "Delhi University (DU)").first()
    if du:
        for c in [bsc, msc, bba, mba]:
            if c not in du.courses: du.courses.append(c)
        db.commit()

    lpu = db.query(College).filter(College.name.ilike("%Lovely Professional University%")).first()
    if lpu:
        for c in [btech, mtech, bca, mca, mba, bba]:
            if c not in lpu.courses: lpu.courses.append(c)
        db.commit()

    # Streams for B.Tech
    eng_stream = get_or_create(Stream, name="Engineering", course_id=btech.id)
    sci_stream = get_or_create(Stream, name="Science", course_id=bsc.id)
    mgmt_stream = get_or_create(Stream, name="Management", course_id=mba.id)
    comp_stream = get_or_create(Stream, name="Computer Applications", course_id=bca.id)

    # Specializations
    cse = get_or_create(Specialization, name="Computer Science", stream_id=eng_stream.id)
    ece = get_or_create(Specialization, name="Electronics", stream_id=eng_stream.id)
    me = get_or_create(Specialization, name="Mechanical", stream_id=eng_stream.id)
    
    it_spec = get_or_create(Specialization, name="Information Technology", stream_id=comp_stream.id)
    fin_spec = get_or_create(Specialization, name="Finance", stream_id=mgmt_stream.id)
    mkt_spec = get_or_create(Specialization, name="Marketing", stream_id=mgmt_stream.id)

    # Areas of Interest
    # Linked to Stream or Course
    aois = [
        {"name": "Web Development", "stream_id": eng_stream.id, "course_id": btech.id},
        {"name": "Mobile App Development", "stream_id": eng_stream.id, "course_id": btech.id},
        {"name": "Data Science", "stream_id": eng_stream.id, "course_id": btech.id},
        {"name": "Artificial Intelligence", "stream_id": eng_stream.id, "course_id": btech.id},
        {"name": "Financial Analysis", "stream_id": mgmt_stream.id, "course_id": mba.id},
        {"name": "Digital Marketing", "stream_id": mgmt_stream.id, "course_id": mba.id},
        {"name": "Cyber Security", "stream_id": comp_stream.id, "course_id": bca.id},
    ]

    for aoi_data in aois:
        get_or_create(AreaOfInterest, **aoi_data)

    print("Advanced seeding completed successfully!")

if __name__ == "__main__":
    seed_advanced()
    db.close()
