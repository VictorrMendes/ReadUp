import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/routes/routes_path.dart';
import 'package:readup/features/home_tabs/presentation/cubits/home_tabs_cubit.dart';
import 'package:readup/features/review/presentation/screens/review_screen.dart';
import 'package:readup/features/vocabulary/presentation/cubits/vocabulary_cubit.dart';
import 'package:readup/features/vocabulary/presentation/screens/vocabulary_screen.dart';
import 'package:readup/shared/domain/models/review.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/harness.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockVocabularyRepository vocabulary;

  setUp(() => vocabulary = MockVocabularyRepository());

  void phone(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
  }

  Future<HomeTabsCubit> pumpVocabulary(WidgetTester tester) async {
    phone(tester);
    final tabs = HomeTabsCubit();
    await tester.pumpWidget(
      wrapApp(
        MultiBlocProvider(
          providers: [
            BlocProvider.value(value: tabs),
            BlocProvider(create: (_) => VocabularyCubit(vocabulary: vocabulary)..load()),
          ],
          child: const VocabularyScreen(),
        ),
        vocabulary: vocabulary,
        routes: {RoutesPath.review: (_) => const Text('tela da revisão')},
      ),
    );
    await tester.pumpAndSettle();
    return tabs;
  }

  testWidgets('palavras salvas com a frase; cartão de revisão abre a revisão', (tester) async {
    when(() => vocabulary.list()).thenAnswer((_) async => savedWords);
    when(() => vocabulary.reviewQueue()).thenAnswer((_) async => queueTwo);
    await pumpVocabulary(tester);

    expect(find.text('2 palavras a revisar · ~1 min'), findsOneWidget);
    expect(find.text('casa'), findsOneWidget);
    expect(find.text('Sem tradução'), findsOneWidget);
    expect(find.text('My Morning'), findsOneWidget);

    await tester.tap(find.text('Revisar (2)'));
    await tester.pumpAndSettle();
    expect(find.text('tela da revisão'), findsOneWidget);
  });

  testWidgets('remover pede confirmação', (tester) async {
    when(() => vocabulary.list()).thenAnswer((_) async => savedWords);
    when(() => vocabulary.reviewQueue()).thenAnswer((_) async => queueTwo);
    when(() => vocabulary.delete(1)).thenAnswer((_) async {});
    await pumpVocabulary(tester);

    await tester.tap(find.byTooltip('Remover house'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Remover'));
    await tester.pumpAndSettle();

    verify(() => vocabulary.delete(1)).called(1);
    expect(find.text('casa'), findsNothing);
  });

  testWidgets('nenhuma palavra: "Ver textos" leva à aba Ler', (tester) async {
    when(() => vocabulary.list()).thenAnswer((_) async => []);
    when(() => vocabulary.reviewQueue())
        .thenAnswer((_) async => const ReviewQueue(cards: [], reviewedToday: 0, dailyLimit: 20));
    final tabs = await pumpVocabulary(tester);

    await tester.tap(find.text('Ver textos'));
    expect(tabs.state, HomeTab.read);
  });

  testWidgets('revisão: mostrar tradução vira o cartão; responder até o resumo', (tester) async {
    phone(tester);
    when(() => vocabulary.reviewQueue()).thenAnswer((_) async => queueTwo);
    when(() => vocabulary.answerReview(1, known: true)).thenAnswer((_) async => 2);
    when(() => vocabulary.answerReview(2, known: true)).thenAnswer((_) async => 2);
    await tester.pumpWidget(wrapApp(const ReviewScreen(), vocabulary: vocabulary));
    await tester.pumpAndSettle();

    expect(find.text('1 de 2'), findsOneWidget);
    expect(find.text('casa'), findsNothing);
    await tester.tap(find.text('Mostrar tradução'));
    await tester.pumpAndSettle();
    expect(find.text('casa'), findsOneWidget);

    await tester.tap(find.text('Já sei'));
    await tester.pumpAndSettle();
    expect(find.text('2 de 2'), findsOneWidget);
    await tester.tap(find.text('Mostrar tradução'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Já sei'));
    await tester.pumpAndSettle();

    expect(find.text('Revisão concluída'), findsOneWidget);
    expect(find.text('+4'), findsOneWidget);
  });

  testWidgets('fila vazia: "Nada para revisar agora"', (tester) async {
    phone(tester);
    when(() => vocabulary.reviewQueue())
        .thenAnswer((_) async => const ReviewQueue(cards: [], reviewedToday: 20, dailyLimit: 20));
    await tester.pumpWidget(wrapApp(const ReviewScreen(), vocabulary: vocabulary));
    await tester.pumpAndSettle();

    expect(find.text('Nada para revisar agora'), findsOneWidget);
    expect(find.textContaining('limite de palavras de hoje'), findsOneWidget);
  });
}
