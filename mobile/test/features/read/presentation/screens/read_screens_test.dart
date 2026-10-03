import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/routes/routes_path.dart';
import 'package:readup/features/read/presentation/screens/book_screen.dart';
import 'package:readup/features/read/presentation/screens/read_screen.dart';
import 'package:readup/features/read/presentation/widgets/library_view.dart';
import 'package:readup/shared/domain/constants/levels.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/harness.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockArticlesRepository articles;
  late MockBooksRepository books;

  setUp(() {
    articles = MockArticlesRepository();
    books = MockBooksRepository();
    when(
      () => articles.list(
        level: any(named: 'level'),
        category: any(named: 'category'),
      ),
    ).thenAnswer((_) async => [article()]);
    when(() => books.list()).thenAnswer((_) async => []);
  });

  void phoneSize(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
  }

  testWidgets('feed do nível da pessoa e troca de seção para os livros', (tester) async {
    phoneSize(tester);
    await tester.pumpWidget(
      wrapApp(
        const ReadScreen(level: EnglishLevel.b1),
        articles: articles,
        books: books,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('The science of sleep'), findsOneWidget);
    verify(() => articles.list(level: EnglishLevel.b1, category: null)).called(1);

    await tester.tap(find.text('Notícias'));
    await tester.pumpAndSettle();
    verify(() => articles.list(level: EnglishLevel.b1, category: 'Notícias')).called(1);

    await tester.tap(find.text('Meus livros'));
    await tester.pumpAndSettle();
    expect(find.text('Você ainda não possui livros'), findsOneWidget);
  });

  testWidgets('nível sem textos: "Ver todos os níveis" tira o filtro', (tester) async {
    phoneSize(tester);
    when(() => articles.list(level: any(named: 'level'), category: null))
        .thenAnswer((_) async => []);
    await tester.pumpWidget(
      wrapApp(
        const ReadScreen(level: EnglishLevel.c1),
        articles: articles,
        books: books,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Nenhum texto para este nível ainda'), findsOneWidget);
    when(() => articles.list(level: null, category: null)).thenAnswer((_) async => [article()]);
    await tester.tap(find.text('Ver todos os níveis'));
    await tester.pumpAndSettle();

    expect(find.text('The science of sleep'), findsOneWidget);
  });

  testWidgets('importar PDF: escolhe, envia e abre o livro', (tester) async {
    phoneSize(tester);
    when(() => books.upload('/tmp/livro.pdf')).thenAnswer((_) async => bookDetail);
    await tester.pumpWidget(
      wrapApp(
        Scaffold(body: LibraryView(pickPdf: () async => '/tmp/livro.pdf')),
        books: books,
        routes: {
          RoutesPath.book: (context) => Text('livro ${ModalRoute.of(context)!.settings.arguments}'),
        },
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Importar PDF'));
    await tester.pumpAndSettle();

    expect(find.text('livro 5'), findsOneWidget);
  });

  testWidgets('cancelar a escolha do arquivo não envia nada', (tester) async {
    phoneSize(tester);
    await tester.pumpWidget(
      wrapApp(
        Scaffold(body: LibraryView(pickPdf: () async => null)),
        books: books,
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Importar PDF'));
    await tester.pumpAndSettle();

    verifyNever(() => books.upload(any()));
  });

  testWidgets('livro: título limpo, continuar no capítulo certo, remover com confirmação', (
    tester,
  ) async {
    phoneSize(tester);
    when(() => books.get(5)).thenAnswer((_) async => bookDetail);
    when(() => books.delete(5)).thenAnswer((_) async {});
    await tester.pumpWidget(
      wrapApp(
        Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () =>
                    Navigator.of(context)
                        .push(MaterialPageRoute<void>(builder: (_) => const BookScreen(bookId: 5))),
                child: const Text('abrir'),
              ),
            ),
          ),
        ),
        books: books,
      ),
    );
    await tester.tap(find.text('abrir'));
    await tester.pumpAndSettle();

    expect(find.text('harry potter and the stone'), findsOneWidget);
    expect(find.text('Continuar leitura'), findsOneWidget);
    expect(find.text('Chapter 2'), findsOneWidget);

    await tester.tap(find.byTooltip('Remover harry potter and the stone'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Remover'));
    await tester.pumpAndSettle();

    verify(() => books.delete(5)).called(1);
    expect(find.text('abrir'), findsOneWidget); // voltou
  });
}
