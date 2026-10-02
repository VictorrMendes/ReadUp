"""progresso mínimo de 1% para quem já leu alguma palavra

Revision ID: e5b1c3d7a9f2
Revises: d3a8f0b6c2e1
Create Date: 2026-10-02 12:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5b1c3d7a9f2"
down_revision: str | Sequence[str] | None = "d3a8f0b6c2e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Capítulos longos com poucas palavras lidas ficavam com 0% (arredondado para baixo)."""
    op.execute("UPDATE reading_progress SET progress = 1 WHERE progress = 0 AND words_read > 0")


def downgrade() -> None:
    """Só dados: o arredondamento antigo é refeito na próxima leitura de cada texto."""
