import re

# Nível CEFR aproximado (a V1 permite aproximação) pela nota Flesch-Kincaid: frases longas e
# palavras com muitas sílabas sobem o nível. Corte (nota FK → CEFR), calibrado com os 10 textos
# de seed, que têm nível atribuído à mão (acerta 9; "The Last Winter at the Lighthouse", B2 à
# mão, dá FK 7.4 → B1):
#   FK < 3   → A1   (frases curtas, palavras de 1–2 sílabas; seed A1: 1.1 e 1.5)
#   FK < 5   → A2   (seed A2: 4.7 e 4.8)
#   FK < 8.5 → B1   (seed B1: 7.0 e 8.2)
#   FK < 11  → B2   (seed B2: 10.0)
#   senão    → C1   (texto jornalístico denso; seed C1: 12.8 e 13.0)
LEVEL_CUTS = ((3.0, "A1"), (5.0, "A2"), (8.5, "B1"), (11.0, "B2"))

_SENTENCE_END = re.compile(r"[.!?]+(?=\s|$)")
_WORD = re.compile(r"[A-Za-z]+(?:['’-][A-Za-z]+)*")
_VOWEL_GROUPS = re.compile(r"[aeiouy]+")


def syllables(word: str) -> int:
    """Estimativa por grupos de vogais (sem dicionário); "e" final mudo não conta."""
    word = word.lower()
    count = len(_VOWEL_GROUPS.findall(word))
    if word.endswith("e") and not word.endswith(("le", "ee")) and count > 1:
        count -= 1
    return max(1, count)


def flesch_kincaid(text: str) -> float:
    words = _WORD.findall(text)
    if not words:
        return 0.0
    sentences = max(1, len(_SENTENCE_END.findall(text)))
    per_sentence = len(words) / sentences
    per_word = sum(syllables(word) for word in words) / len(words)
    return 0.39 * per_sentence + 11.8 * per_word - 15.59


def estimate_level(text: str) -> str:
    score = flesch_kincaid(text)
    for cut, level in LEVEL_CUTS:
        if score < cut:
            return level
    return "C1"
