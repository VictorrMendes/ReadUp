from datetime import date, timedelta

# Ofensiva: um dia conta quando a meta diária é cumprida. Sempre calculada no servidor.


def next_streak(
    current: int, longest: int, last_active_day: date | None, today: date
) -> tuple[int, int]:
    """(current, longest) depois de contar `today`. Contar o mesmo dia de novo não muda nada."""
    if last_active_day == today:
        return current, longest
    current = current + 1 if last_active_day == today - timedelta(days=1) else 1
    return current, max(longest, current)


def effective_streak(current: int, last_active_day: date | None, today: date) -> int:
    """Ofensiva para exibição: vale se o último dia contado foi hoje ou ontem; senão quebrou."""
    if last_active_day is None or (today - last_active_day).days > 1:
        return 0
    return current
