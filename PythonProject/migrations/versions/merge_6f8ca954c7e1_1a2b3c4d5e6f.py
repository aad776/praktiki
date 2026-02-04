"""merge heads 6f8ca954c7e1 and 1a2b3c4d5e6f

Revision ID: 2f7a9b1c3d4e
Revises: 6f8ca954c7e1, 1a2b3c4d5e6f
Create Date: 2026-02-03
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2f7a9b1c3d4e'
down_revision: Union[str, Sequence[str], None] = ('6f8ca954c7e1', '1a2b3c4d5e6f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This is a merge migration; no schema changes required here.
    pass


def downgrade() -> None:
    # Downgrading a merge is a no-op.
    pass
