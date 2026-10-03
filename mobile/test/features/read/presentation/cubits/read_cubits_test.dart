import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/features/read/presentation/cubits/book_cubit.dart';
import 'package:readup/features/read/presentation/cubits/library_cubit.dart';
import 'package:readup/features/read/presentation/cubits/text_feed_cubit.dart';
import 'package:readup/shared/domain/constants/levels.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/mocks.dart';

void main() {
  group('feed', () {
    late MockArticlesRepository articles;
    setUp(() => articles = MockArticlesRepository());

    blocTest<TextFeedCubit, TextFeedState>(
      'carrega os textos do nível',
      setUp: () =>
          when(() => articles.list(level: EnglishLevel.b1, category: null))
              .thenAnswer((_) async => [article()]),
      build: () => TextFeedCubit(articles: articles, initialLevel: EnglishLevel.b1),
      act: (cubit) => cubit.load(),
      expect: () => [
        TextFeedState(level: EnglishLevel.b1, articles: [article()]),
      ],
    );

    blocTest<TextFeedCubit, TextFeedState>(
      'nível sem notícias: mostra o nível acima mais próximo, com aviso',
      setUp: () {
        when(
          () => articles.list(
            level: any(named: 'level'),
            category: 'Notícias',
          ),
        ).thenAnswer((_) async => []);
        when(() => articles.list(level: EnglishLevel.b1, category: 'Notícias'))
            .thenAnswer((_) async => [article()]);
      },
      build: () =>
          TextFeedCubit(articles: articles, initialLevel: EnglishLevel.a1, category: 'Notícias'),
      act: (cubit) => cubit.load(),
      expect: () => [
        TextFeedState(
          level: EnglishLevel.a1,
          articles: [article()],
          fallbackLevel: EnglishLevel.b1,
        ),
      ],
    );

    test('resposta de um filtro antigo que chega depois é descartada', () async {
      final slow = Completer<List<Never>>();
      when(() => articles.list(level: EnglishLevel.a1, category: null))
          .thenAnswer((_) => slow.future);
      when(() => articles.list(level: null, category: null)).thenAnswer((_) async => [article()]);
      final cubit = TextFeedCubit(articles: articles, initialLevel: EnglishLevel.a1);

      unawaited(cubit.load());
      await cubit.levelSelected(null);
      slow.complete([]);
      await Future<void>.delayed(Duration.zero);

      expect(cubit.state, TextFeedState(articles: [article()]));
    });

    blocTest<TextFeedCubit, TextFeedState>(
      'falha: mensagem do servidor',
      setUp: () => when(
        () => articles.list(
          level: any(named: 'level'),
          category: any(named: 'category'),
        ),
      ).thenAnswer((_) async => throw const RequestFailure(message: 'Sem conexão')),
      build: () => TextFeedCubit(articles: articles),
      act: (cubit) => cubit.load(),
      expect: () => [const TextFeedState(error: 'Sem conexão')],
    );
  });

  group('biblioteca', () {
    late MockBooksRepository books;
    setUp(() => books = MockBooksRepository());

    blocTest<LibraryCubit, LibraryState>(
      'importar: envia, marca o livro para abrir e recarrega a lista',
      setUp: () {
        when(() => books.upload('/tmp/a.pdf')).thenAnswer((_) async => bookDetail);
        when(() => books.list()).thenAnswer((_) async => [bookDetail.book]);
      },
      build: () => LibraryCubit(books: books),
      seed: () => const LibraryState(books: []),
      act: (cubit) => cubit.importPdf('/tmp/a.pdf'),
      expect: () => [
        const LibraryState(books: [], importing: true),
        const LibraryState(books: [], importedBookId: 5),
        LibraryState(books: [bookDetail.book], importedBookId: 5),
      ],
    );

    blocTest<LibraryCubit, LibraryState>(
      'importação recusada: mensagem do backend (tamanho, não é PDF, limite)',
      setUp: () => when(() => books.upload(any())).thenAnswer(
        (_) async => throw const RequestFailure(message: 'Arquivo não é um PDF', code: 422),
      ),
      build: () => LibraryCubit(books: books),
      seed: () => const LibraryState(books: []),
      act: (cubit) => cubit.importPdf('/tmp/foto.pdf'),
      expect: () => [
        const LibraryState(books: [], importing: true),
        const LibraryState(books: [], importError: 'Arquivo não é um PDF'),
      ],
    );
  });

  group('livro', () {
    late MockBooksRepository books;
    setUp(() => books = MockBooksRepository());

    blocTest<BookCubit, BookState>(
      'não encontrado (de outra pessoa ou removido): 404',
      setUp: () => when(() => books.get(9)).thenAnswer(
        (_) async => throw const RequestFailure(message: 'Livro não encontrado', code: 404),
      ),
      build: () => BookCubit(books: books, bookId: 9),
      act: (cubit) => cubit.load(),
      expect: () => [const BookState(error: 'Livro não encontrado', notFound: true)],
    );

    blocTest<BookCubit, BookState>(
      'remover avisa a tela para voltar',
      setUp: () => when(() => books.delete(5)).thenAnswer((_) async {}),
      build: () => BookCubit(books: books, bookId: 5),
      seed: () => BookState(detail: bookDetail),
      act: (cubit) => cubit.delete(),
      expect: () => [BookState(detail: bookDetail, deleted: true)],
    );
  });
}
