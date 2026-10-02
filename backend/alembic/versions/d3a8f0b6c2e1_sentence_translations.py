"""tradução de frases: cache global e contagem diária por usuário

Revision ID: d3a8f0b6c2e1
Revises: c7e2a91f4d10
Create Date: 2026-10-01 20:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d3a8f0b6c2e1"
down_revision: str | Sequence[str] | None = "c7e2a91f4d10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "sentence_translations",
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("translation", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("text", name=op.f("pk_sentence_translations")),
    )
    op.add_column(
        "daily_stats",
        sa.Column("sentences_translated", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_check_constraint(
        op.f("ck_daily_stats_sentences_translated_non_negative"),
        "daily_stats",
        "sentences_translated >= 0",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f("ck_daily_stats_sentences_translated_non_negative"), "daily_stats", type_="check"
    )
    op.drop_column("daily_stats", "sentences_translated")
    op.drop_table("sentence_translations")
