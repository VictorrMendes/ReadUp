"""streak freezes

Revision ID: f2b9d4e6a8c3
Revises: e5b1c3d7a9f2
Create Date: 2026-10-02 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f2b9d4e6a8c3"
down_revision: str | Sequence[str] | None = "e5b1c3d7a9f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # ofensivas existentes ganham os 2 escudos do começo
    op.add_column("streaks", sa.Column("freezes", sa.Integer(), server_default="2", nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("streaks", "freezes")
