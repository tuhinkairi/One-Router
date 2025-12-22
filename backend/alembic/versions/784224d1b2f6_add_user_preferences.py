"""add_user_preferences

Revision ID: 784224d1b2f6
Revises: aca6ee819731
Create Date: 2025-12-22 13:12:10.072286

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '784224d1b2f6'
down_revision: Union[str, None] = 'aca6ee819731'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add preferences column to users table
    op.add_column('users', sa.Column('preferences', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False))


def downgrade() -> None:
    # Remove preferences column from users table
    op.drop_column('users', 'preferences')
