from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, certificates, credits, admin, notifications
from app.database import engine, Base
from app.models import TaxonomySkill
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI(title="Certificate Verification System", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed Taxonomy Data
    async with AsyncSession(engine) as session:
        result = await session.execute(select(TaxonomySkill).limit(1))
        if not result.scalars().first():
            example_skills = [
                {"skill_name": "Python", "taxonomy_code": "CS-DS-101", "domain": "Computer Science"},
                {"skill_name": "Data Analysis", "taxonomy_code": "CS-DS-202", "domain": "Computer Science"},
                {"skill_name": "Machine Learning", "taxonomy_code": "CS-AI-303", "domain": "Artificial Intelligence"},
                {"skill_name": "FastAPI", "taxonomy_code": "CS-WEB-404", "domain": "Web Development"},
            ]
            for skill in example_skills:
                session.add(TaxonomySkill(**skill))
            await session.commit()

# Include Routers
app.include_router(auth.router)
app.include_router(certificates.router)
app.include_router(credits.router)
app.include_router(admin.router)
app.include_router(notifications.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Certificate Verification API"}
