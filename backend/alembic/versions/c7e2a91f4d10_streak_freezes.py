"""streak freezes

Revision ID: c7e2a91f4d10
Revises: fde7c6049469
Create Date: 2026-10-02 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c7e2a91f4d10"
down_revision: str | Sequence[str] | None = "fde7c6049469"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # ofensivas existentes ganham os 2 escudos do começo
    op.add_column("streaks", sa.Column("freezes", sa.Integer(), server_default="2", nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("streaks", "freezes")
