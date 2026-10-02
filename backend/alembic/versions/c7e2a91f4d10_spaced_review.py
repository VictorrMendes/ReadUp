"""revisão espaçada: caixa e próxima revisão das palavras, contagem diária de revisões

Revision ID: c7e2a91f4d10
Revises: fde7c6049469
Create Date: 2026-10-01 15:00:00.000000

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
    op.add_column(
        "saved_words",
        sa.Column("box", sa.SmallInteger(), server_default="0", nullable=False),
    )
    op.add_column("saved_words", sa.Column("due_on", sa.Date(), nullable=True))
    op.create_check_constraint(
        op.f("ck_saved_words_box_range"), "saved_words", "box BETWEEN 0 AND 6"
    )
    # palavras já salvas entram na fila no dia seguinte ao salvamento (dia local do app); as
    # antigas já ficam vencidas e aparecem na primeira revisão
    op.execute(
        "UPDATE saved_words SET due_on = (created_at AT TIME ZONE 'America/Sao_Paulo')::date + 1"
    )
    op.add_column(
        "daily_stats",
        sa.Column("words_reviewed", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "daily_stats",
        sa.Column("review_xp", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_check_constraint(
        op.f("ck_daily_stats_words_reviewed_non_negative"), "daily_stats", "words_reviewed >= 0"
    )
    op.create_check_constraint(
        op.f("ck_daily_stats_review_xp_non_negative"), "daily_stats", "review_xp >= 0"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f("ck_daily_stats_review_xp_non_negative"), "daily_stats", type_="check")
    op.drop_constraint(
        op.f("ck_daily_stats_words_reviewed_non_negative"), "daily_stats", type_="check"
    )
    op.drop_column("daily_stats", "review_xp")
    op.drop_column("daily_stats", "words_reviewed")
    op.drop_constraint(op.f("ck_saved_words_box_range"), "saved_words", type_="check")
    op.drop_column("saved_words", "due_on")
    op.drop_column("saved_words", "box")
