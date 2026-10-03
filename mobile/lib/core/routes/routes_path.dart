/// Nomes das telas empilhadas sobre as abas (nada de string solta pelas telas).
abstract final class RoutesPath {
  /// leitor; argumento: id do texto (int)
  static const article = '/article';

  /// livro importado; argumento: id do livro (int)
  static const book = '/book';

  /// revisão espaçada das palavras salvas
  static const review = '/review';
}
