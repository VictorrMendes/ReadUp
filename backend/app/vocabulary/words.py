import re

MAX_WORD_LENGTH = 40

# pontuação de texto corrido que pode vir grudada na palavra tocada
_EDGES = " \t\n\r.,;:!?\"'()[]{}…—–-“”‘’«»¡¿"
# letras (com acento), com apóstrofo ou hífen só no meio
_WORD = re.compile(r"[^\W\d_]+(?:['-][^\W\d_]+)*")


def normalize_word(text: str) -> str | None:
    """Uma palavra em minúsculas, sem espaços e pontuação nas pontas; qualquer outra coisa → None.

    É a barreira que impede usar a tradução como tradutor de texto livre.
    """
    word = text.replace("’", "'").strip(_EDGES).lower()
    if not 1 <= len(word) <= MAX_WORD_LENGTH or not _WORD.fullmatch(word):
        return None
    return word
