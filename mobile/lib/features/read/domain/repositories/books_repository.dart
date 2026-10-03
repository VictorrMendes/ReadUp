import '../../../../core/core.dart';
import '../models/book.dart';

class BooksRepository {
  BooksRepository({required this._httpHelper});

  final HttpHelper _httpHelper;

  Future<List<Book>> list() => repositoryExceptionHandlerScope(() async {
    final response = await _httpHelper.get('/books');
    return [
      for (final item in response! as List<Object?>) Book.fromJson(item! as Map<String, Object?>),
    ];
  });

  Future<BookDetail> get(int id) => repositoryExceptionHandlerScope(
    () async => BookDetail.fromJson((await _httpHelper.get('/books/$id'))! as Map<String, Object?>),
  );

  /// Envia o PDF (o nome do arquivo vira o título; o backend separa os capítulos na hora).
  Future<BookDetail> upload(String filePath) => repositoryExceptionHandlerScope(() async {
    final response = await _httpHelper.upload('/books', field: 'file', filePath: filePath);
    return BookDetail.fromJson(response! as Map<String, Object?>);
  });

  Future<void> delete(int id) =>
      repositoryExceptionHandlerScope(() => _httpHelper.delete('/books/$id'));
}
