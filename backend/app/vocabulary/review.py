from datetime import date, timedelta

# Revisão espaçada com caixas de Leitner. Palavra nova entra na caixa 0 com revisão no dia seguinte.
# "Já sei" sobe uma caixa e espera o intervalo dela; "ainda aprendendo" volta à caixa 0 (amanhã).
# Quem sobe além da última caixa vira dominada e sai da fila (due_on null).
INTERVAL_DAYS = (1, 3, 7, 14, 30, 90)  # índice = caixa
MASTERED_BOX = len(INTERVAL_DAYS)  # 6

DAILY_REVIEW_LIMIT = 20  # respostas por dia
XP_PER_KNOWN = 2
DAILY_REVIEW_XP_CAP = 20


def first_due(today: date) -> date:
    """Palavra recém-salva: primeira revisão no dia seguinte."""
    return today + timedelta(days=INTERVAL_DAYS[0])


def next_state(box: int, known: bool, today: date) -> tuple[int, date | None]:
    """(caixa, próxima revisão) depois de responder; None = dominada."""
    if not known:
        return 0, first_due(today)
    box += 1
    if box >= MASTERED_BOX:
        return MASTERED_BOX, None
    return box, today + timedelta(days=INTERVAL_DAYS[box])


def review_xp(known: bool, review_xp_today: int) -> int:
    """XP desta resposta: só acerto rende, até o teto diário da revisão."""
    if not known:
        return 0
    return max(0, min(XP_PER_KNOWN, DAILY_REVIEW_XP_CAP - review_xp_today))
