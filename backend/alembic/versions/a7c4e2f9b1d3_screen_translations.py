"""screen translations

Revision ID: a7c4e2f9b1d3
Revises: f2b9d4e6a8c3
Create Date: 2026-10-05 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7c4e2f9b1d3"
down_revision: str | Sequence[str] | None = "f2b9d4e6a8c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    for column in ("screen_translations", "ai_translations"):
        op.add_column(
            "daily_stats", sa.Column(column, sa.Integer(), server_default="0", nullable=False)
        )
        op.create_check_constraint(
            op.f(f"ck_daily_stats_{column}_non_negative"), "daily_stats", f"{column} >= 0"
        )


def downgrade() -> None:
    """Downgrade schema."""
    for column in ("ai_translations", "screen_translations"):
        op.drop_constraint(
            op.f(f"ck_daily_stats_{column}_non_negative"), "daily_stats", type_="check"
        )
        op.drop_column("daily_stats", column)
