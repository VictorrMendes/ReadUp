import '../../../../core/core.dart';
import '../models/article_detail.dart';
import '../models/progress_result.dart';

class ReadingRepository {
  ReadingRepository({required this._httpHelper});

  final HttpHelper _httpHelper;

  Future<ArticleDetail> article(int id) => repositoryExceptionHandlerScope(
    () async =>
        ArticleDetail.fromJson((await _httpHelper.get('/articles/$id'))! as Map<String, Object?>),
  );

  /// Progresso (maior % rolado) e segundos lidos desde o último envio; o servidor valida e credita.
  Future<ProgressResult> saveProgress({
    required int articleId,
    required int progress,
    required int seconds,
  }) => repositoryExceptionHandlerScope(() async {
    final response = await _httpHelper.post(
      '/reading/progress',
      body: {'article_id': articleId, 'progress': progress, 'seconds': seconds},
    );
    return ProgressResult.fromJson(response! as Map<String, Object?>);
  });
}
