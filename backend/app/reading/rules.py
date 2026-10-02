# Validação simples de leitura (não é antifraude): crédito limitado pelo avanço real e pelo tempo.
MAX_WORDS_PER_SECOND = 10  # 600 palavras/min, generoso


def credit(word_count: int, words_read_before: int, reported_progress: int, seconds: int) -> int:
    """Palavras lidas depois deste registro. Nunca diminui e nunca passa de word_count."""
    target = -(-word_count * reported_progress // 100)  # ceil em inteiros
    gain = max(0, target - words_read_before)
    gain = min(gain, seconds * MAX_WORDS_PER_SECOND)
    return min(word_count, words_read_before + gain)


def progress_percent(words_read: int, word_count: int) -> int:
    """0..100 (floor); 100 só quando todas as palavras foram creditadas. Quem já leu alguma
    palavra fica com pelo menos 1: num livro de 80 mil palavras, 645 lidas não podem virar 0%
    (sumiria de "continuar lendo" e de "livros iniciados")."""
    if words_read >= word_count:
        return 100
    if words_read <= 0:
        return 0
    return max(1, min(99, words_read * 100 // word_count))
