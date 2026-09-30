# Regras de XP. O XP é sempre calculado no servidor, a partir de palavras creditadas.
WORDS_PER_XP = 10
TEXT_COMPLETED_XP = 20
DAILY_GOAL_XP = 50
# texto menor que isso conta como concluído, mas não dá o bônus (evita farm com textos
# minúsculos, ex.: capítulos de 1 palavra num PDF)
MIN_WORDS_FOR_COMPLETION_XP = 100


def xp_for_words(words_before: int, words_after: int) -> int:
    """XP pelas palavras do dia: sobre o total, para não perder o resto entre envios."""
    return words_after // WORDS_PER_XP - words_before // WORDS_PER_XP


def completion_xp(word_count: int) -> int:
    """Bônus por concluir um texto de `word_count` palavras."""
    return TEXT_COMPLETED_XP if word_count >= MIN_WORDS_FOR_COMPLETION_XP else 0
