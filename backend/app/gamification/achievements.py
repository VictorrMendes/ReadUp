from typing import Literal, NamedTuple

from pydantic import BaseModel

# Conquistas DERIVADAS de métricas que só crescem, calculadas na hora (sem tabela): uma conquista
# nunca se perde. Sem XP por conquista. Palavras salvas e livros ficam de fora (podem ser apagados).
Metric = Literal["texts_completed", "words_total", "goal_days", "longest_streak"]


class Metrics(NamedTuple):
    words_total: int  # soma de daily_stats.words_read
    texts_completed: int  # soma de daily_stats.texts_completed
    goal_days: int  # dias com goal_met
    longest_streak: int  # streaks.longest


class Achievement(NamedTuple):
    id: str  # estável: o app e as respostas usam este id
    title: str
    description: str
    icon: str  # nome Ionicons
    metric: Metric
    target: int


CATALOG: tuple[Achievement, ...] = (
    Achievement(
        "first-text", "Primeira leitura", "Concluir 1 texto", "book-outline", "texts_completed", 1
    ),
    Achievement(
        "texts-10",
        "Leitor constante",
        "Concluir 10 textos",
        "library-outline",
        "texts_completed",
        10,
    ),
    Achievement(
        "texts-50", "Devorador de textos", "Concluir 50 textos", "library", "texts_completed", 50
    ),
    Achievement(
        "words-1k", "Mil palavras", "Ler 1.000 palavras", "reader-outline", "words_total", 1000
    ),
    Achievement(
        "words-10k", "Dez mil palavras", "Ler 10.000 palavras", "reader", "words_total", 10000
    ),
    Achievement(
        "words-50k", "Cinquenta mil palavras", "Ler 50.000 palavras", "school", "words_total", 50000
    ),
    Achievement(
        "goal-1",
        "Meta cumprida",
        "Cumprir a meta diária pela primeira vez",
        "flag-outline",
        "goal_days",
        1,
    ),
    Achievement(
        "goal-7",
        "Uma semana de metas",
        "Cumprir a meta em 7 dias (não precisam ser seguidos)",
        "flag",
        "goal_days",
        7,
    ),
    Achievement(
        "streak-3",
        "Três dias seguidos",
        "Chegar a uma ofensiva de 3 dias",
        "flame-outline",
        "longest_streak",
        3,
    ),
    Achievement(
        "streak-7",
        "Uma semana seguida",
        "Chegar a uma ofensiva de 7 dias",
        "flame",
        "longest_streak",
        7,
    ),
)


class AchievementStatus(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    target: int
    current: int  # limitado ao alvo
    unlocked: bool


def evaluate(metrics: Metrics) -> list[AchievementStatus]:
    """Estado de cada conquista do catálogo, na ordem do catálogo."""
    statuses = []
    for achievement in CATALOG:
        value = getattr(metrics, achievement.metric)
        statuses.append(
            AchievementStatus(
                id=achievement.id,
                title=achievement.title,
                description=achievement.description,
                icon=achievement.icon,
                target=achievement.target,
                current=min(value, achievement.target),
                unlocked=value >= achievement.target,
            )
        )
    return statuses


def newly_unlocked(before: Metrics, after: Metrics) -> list[AchievementStatus]:
    """Conquistas que viraram desbloqueadas entre `before` e `after`."""
    was = {status.id for status in evaluate(before) if status.unlocked}
    return [status for status in evaluate(after) if status.unlocked and status.id not in was]
