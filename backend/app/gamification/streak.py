from datetime import date

# Ofensiva (plan.txt §4.5): o dia conta com o "mínimo do dia" (ler MIN_STREAK_WORDS palavras;
# meta batida é a chama dourada, à parte). Dia em branco gasta um escudo sozinho; sem escudo
# suficiente, a ofensiva recomeça. Sempre calculada no servidor.

MIN_STREAK_WORDS = 50  # = menor meta permitida: meta batida sempre mantém a ofensiva
MAX_FREEZES = 2  # escudos ao começar uma ofensiva e teto da recarga
FREEZE_EVERY = 7  # a cada 7 dias de ofensiva, um escudo volta (até MAX_FREEZES)


def _missed_days(last_active_day: date, today: date) -> int:
    """Dias inteiros em branco entre o último dia contado e hoje (hoje ainda não acabou)."""
    return (today - last_active_day).days - 1


def next_streak(
    current: int, longest: int, freezes: int, last_active_day: date | None, today: date
) -> tuple[int, int, int]:
    """(current, longest, freezes) depois de contar `today`. Contar o mesmo dia de novo não muda
    nada. Dias em branco são cobertos por escudos (um por dia); sem escudos, volta a 1."""
    if last_active_day == today:
        return current, longest, freezes
    missed = None if last_active_day is None else _missed_days(last_active_day, today)
    if current > 0 and missed is not None and missed <= freezes:
        current, freezes = current + 1, freezes - missed
    else:
        current, freezes = 1, MAX_FREEZES
    if current % FREEZE_EVERY == 0:
        freezes = min(MAX_FREEZES, freezes + 1)
    return current, max(longest, current), freezes


def effective_streak(
    current: int, freezes: int, last_active_day: date | None, today: date
) -> tuple[int, int]:
    """(ofensiva, escudos restantes) para exibição. Os escudos dos dias em branco já contam como
    gastos; sem escudo para cobrir algum dia, quebrou: (0, 0)."""
    if last_active_day is None:
        return 0, 0
    missed = max(0, _missed_days(last_active_day, today))
    if current == 0 or missed > freezes:
        return 0, 0
    return current, freezes - missed
