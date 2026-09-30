# Regras de XP. O XP é sempre calculado no servidor, a partir de palavras creditadas.
WORDS_PER_XP = 10
TEXT_COMPLETED_XP = 20
DAILY_GOAL_XP = 50


def xp_for_words(words_before: int, words_after: int) -> int:
    """XP pelas palavras do dia: sobre o total, para não perder o resto entre envios."""
    return words_after // WORDS_PER_XP - words_before // WORDS_PER_XP
