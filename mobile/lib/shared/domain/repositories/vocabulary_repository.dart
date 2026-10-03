import '../../../core/core.dart';
import '../models/vocabulary.dart';

/// Palavras: tradução, salvar/remover e tradução de frase.
class VocabularyRepository {
  VocabularyRepository({required this._httpHelper});

  final HttpHelper _httpHelper;

  Future<Lookup> lookup(String word) => repositoryExceptionHandlerScope(() async {
    final response = await _httpHelper.get(
      '/vocabulary/lookup?word=${Uri.encodeQueryComponent(word)}',
    );
    return Lookup.fromJson(response! as Map<String, Object?>);
  });

  /// Idempotente: salvar de novo devolve a palavra já salva.
  Future<SavedWord> save({required String word, int? articleId, String? context}) =>
      repositoryExceptionHandlerScope(() async {
        final response = await _httpHelper.post(
          '/vocabulary',
          body: {'word': word, 'article_id': ?articleId, 'context': ?context},
        );
        return SavedWord.fromJson(response! as Map<String, Object?>);
      });

  // ponytail: sem paginação; limit 100 é o teto do backend. Paginar quando alguém passar disso.
  Future<List<SavedWord>> list() => repositoryExceptionHandlerScope(() async {
    final response = await _httpHelper.get('/vocabulary?limit=100');
    return [
      for (final item in response! as List<Object?>)
        SavedWord.fromJson(item! as Map<String, Object?>),
    ];
  });

  Future<void> delete(int id) =>
      repositoryExceptionHandlerScope(() => _httpHelper.delete('/vocabulary/$id'));

  /// Tradução de uma frase do texto aberto (o backend confere que a frase está nele). null:
  /// indisponível no momento; 429 = limite diário.
  Future<String?> translateSentence({required int articleId, required String text}) =>
      repositoryExceptionHandlerScope(() async {
        final response = await _httpHelper.post(
          '/vocabulary/translate-sentence',
          body: {'article_id': articleId, 'text': text},
        );
        return (response! as Map<String, Object?>)['translation'] as String?;
      });
}
