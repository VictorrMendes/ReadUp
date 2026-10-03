import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/features/read/domain/repositories/books_repository.dart';
import 'package:readup/shared/domain/models/book_title.dart';

import '../../../fakes/fixtures.dart';
import '../../../fakes/mocks.dart';

void main() {
  test('título legível de livros importados antes da limpeza no backend', () {
    expect(cleanBookTitle('harry-potter-and-the-stone'), 'harry potter and the stone');
    expect(cleanBookTitle('The%20Last%20Wish'), 'The Last Wish');
    expect(cleanBookTitle('my_book__final'), 'my book final');
    expect(cleanBookTitle('Well-known Tales'), 'Well-known Tales'); // tem espaço: hífen fica
    expect(cleanBookTitle('100% real'), '100% real'); // "%" solto não quebra
  });

  test('continuar: o primeiro capítulo não concluído; capítulo vira cartão de leitura', () {
    expect(bookDetail.continueChapter?.id, 102);
    final card = bookDetail.chapters.first.toSummary();
    expect(card.category, 'Capítulo 1');
    expect(card.completed, isTrue);
  });

  test('importar envia o PDF como multipart no campo "file"', () async {
    final http = MockHttpHelper();
    when(
      () => http.upload(
        any(),
        field: any(named: 'field'),
        filePath: any(named: 'filePath'),
      ),
    ).thenAnswer((_) async => bookJson(chapters: [chapterJson(101, 1)]));

    final detail = await BooksRepository(httpHelper: http).upload('/tmp/livro.pdf');

    expect(detail.book.id, 5);
    verify(() => http.upload('/books', field: 'file', filePath: '/tmp/livro.pdf')).called(1);
  });
}
