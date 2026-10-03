/// Espaçamentos (múltiplos de 4) e raios. Telas usam só estes valores.
abstract final class Spaces {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
  static const xxl = 32.0;
  static const xxxl = 48.0;

  /// área de toque mínima (acessibilidade)
  static const touchTarget = 48.0;

  /// largura máxima da coluna de leitura (linha confortável em tablet)
  static const readingMaxWidth = 680.0;
}

abstract final class Radii {
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const card = 20.0;
  static const sheet = 28.0;
}
