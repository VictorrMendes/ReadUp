import math
import re

# números com separador ("1,000", "3.5") contam 1; palavras podem ter apóstrofo ou hífen
# internos ("don't", "well-known"); pontuação solta não conta.
_WORD = re.compile(r"\d+(?:[.,]\d+)+|\w+(?:['’-]\w+)*")

WORDS_PER_MINUTE = 200


def count_words(text: str) -> int:
    return len(_WORD.findall(text))


def estimated_minutes(word_count: int) -> int:
    return max(1, math.ceil(word_count / WORDS_PER_MINUTE))
