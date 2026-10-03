import '../../../core/core.dart';
import '../constants/levels.dart';
import '../models/article_summary.dart';

class ArticlesRepository {
  ArticlesRepository({required this._httpHelper});

  final HttpHelper _httpHelper;

  // ponytail: sem paginação; limit 50 cobre o catálogo atual
  Future<List<ArticleSummary>> list({EnglishLevel? level, String? category}) =>
      repositoryExceptionHandlerScope(() async {
        final query = {'limit': '50', 'level': ?level?.code, 'category': ?category};
        return _parse(await _httpHelper.get('/articles?${Uri(queryParameters: query).query}'));
      });

  /// "Continuar lendo": o texto começado e não concluído mais recente.
  Future<ArticleSummary?> continueReading() => repositoryExceptionHandlerScope(() async {
    final latest = _parse(await _httpHelper.get('/articles?in_progress=true&limit=1'));
    return latest.isEmpty ? null : latest.first;
  });

  List<ArticleSummary> _parse(Object? response) => [
    for (final item in response! as List<Object?>)
      ArticleSummary.fromJson(item! as Map<String, Object?>),
  ];
}
