/// Nível CEFR aproximado (mesmos textos do web e do backend).
enum EnglishLevel {
  a1('A1', 'Iniciante — frases simples do dia a dia'),
  a2('A2', 'Básico — textos curtos sobre temas conhecidos'),
  b1('B1', 'Intermediário — entende a ideia principal de textos'),
  b2('B2', 'Intermediário avançado — lê artigos com fluência'),
  c1('C1', 'Avançado — textos longos e complexos');

  const EnglishLevel(this.code, this.description);

  final String code;
  final String description;

  static EnglishLevel? fromCode(String? code) {
    for (final level in values) {
      if (level.code == code) return level;
    }
    return null;
  }
}

/// Metas diárias oferecidas (palavras); ~200 palavras por minuto de leitura.
const goalOptions = [300, 500, 1000, 2000];
const wordsPerMinute = 200;
