"""extend employer_profile and student_resume with additional fields

Revision ID: 1a2b3c4d5e6f
Revises: e512d5d207c5
Create Date: 2026-02-03
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1a2b3c4d5e6f'
down_revision = 'e512d5d207c5'
branch_labels = None
depends_on = None


def upgrade():
    # EmployerProfile additions
    op.add_column('employer_profiles', sa.Column('designation', sa.String(), nullable=True))
    op.add_column('employer_profiles', sa.Column('organization_description', sa.Text(), nullable=True))
    op.add_column('employer_profiles', sa.Column('city', sa.String(), nullable=True))
    op.add_column('employer_profiles', sa.Column('industry', sa.String(), nullable=True))
    op.add_column('employer_profiles', sa.Column('employee_count', sa.String(), nullable=True))
    op.add_column('employer_profiles', sa.Column('logo_url', sa.String(), nullable=True))
    op.add_column('employer_profiles', sa.Column('website_url', sa.String(), nullable=True))
    op.add_column('employer_profiles', sa.Column('license_document_url', sa.String(), nullable=True))
    op.add_column('employer_profiles', sa.Column('social_media_link', sa.String(), nullable=True))
    op.add_column('employer_profiles', sa.Column('is_verified', sa.Boolean(), nullable=True, server_default=sa.text('0')))

    # StudentResume additions
    op.add_column('student_resumes', sa.Column('education_entries', sa.Text(), nullable=True))
    op.add_column('student_resumes', sa.Column('skills_categorized', sa.Text(), nullable=True))
    op.add_column('student_resumes', sa.Column('title', sa.String(), nullable=True))
    op.add_column('student_resumes', sa.Column('linkedin', sa.String(), nullable=True))
    op.add_column('student_resumes', sa.Column('profile_picture', sa.String(), nullable=True))


def downgrade():
    # EmployerProfile removals
    op.drop_column('employer_profiles', 'is_verified')
    op.drop_column('employer_profiles', 'social_media_link')
    op.drop_column('employer_profiles', 'license_document_url')
    op.drop_column('employer_profiles', 'website_url')
    op.drop_column('employer_profiles', 'logo_url')
    op.drop_column('employer_profiles', 'employee_count')
    op.drop_column('employer_profiles', 'industry')
    op.drop_column('employer_profiles', 'city')
    op.drop_column('employer_profiles', 'organization_description')
    op.drop_column('employer_profiles', 'designation')

    # StudentResume removals
    op.drop_column('student_resumes', 'profile_picture')
    op.drop_column('student_resumes', 'linkedin')
    op.drop_column('student_resumes', 'title')
    op.drop_column('student_resumes', 'skills_categorized')
    op.drop_column('student_resumes', 'education_entries')

