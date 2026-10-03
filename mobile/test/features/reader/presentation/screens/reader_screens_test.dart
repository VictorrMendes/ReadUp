import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/features/reader/domain/models/progress_result.dart';
import 'package:readup/features/reader/presentation/screens/article_screen.dart';
import 'package:readup/features/reader/presentation/screens/completion_screen.dart';
import 'package:readup/features/reader/presentation/widgets/confetti.dart';
import 'package:readup/features/reader/presentation/widgets/paragraph_view.dart';
import 'package:readup/shared/domain/models/vocabulary.dart';
import 'package:readup/shared/domain/models/stats.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/harness.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockReadingRepository reading;
  late MockVocabularyRepository vocabulary;
  late MockStatsRepository stats;

  setUp(() {
    reading = MockReadingRepository();
    vocabulary = MockVocabularyRepository();
    stats = MockStatsRepository();
    when(() => reading.article(10)).thenAnswer((_) async => articleDetail());
    when(
      () => reading.saveProgress(
        articleId: any(named: 'articleId'),
        progress: any(named: 'progress'),
        seconds: any(named: 'seconds'),
      ),
    ).thenAnswer((_) async => progressResult());
    when(() => vocabulary.list()).thenAnswer((_) async => []);
  });

  void phone(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
  }

  Future<void> pumpReader(WidgetTester tester) async {
    phone(tester);
    await tester.pumpWidget(
      wrapApp(
        const ArticleScreen(articleId: 10),
        reading: reading,
        vocabulary: vocabulary,
        stats: stats,
      ),
    );
    await tester.pumpAndSettle();
  }

  // primeira palavra do primeiro parágrafo ("The")
  Offset firstWord(WidgetTester tester) =>
      tester.getTopLeft(find.byType(ParagraphView).first) + const Offset(12, 14);

  testWidgets('tocar numa palavra abre o painel com a tradução; salvar marca como salva', (
    tester,
  ) async {
    when(() => vocabulary.lookup('the'))
        .thenAnswer((_) async => const Lookup(word: 'the', translation: 'o, a', savedId: null));
    when(() => vocabulary.save(word: 'the', articleId: 10, context: 'The house is big.'))
        .thenAnswer(
          (_) async => const SavedWord(
            id: 3,
            word: 'the',
            translation: 'o, a',
            context: null,
            articleId: 10,
            articleTitle: null,
          ),
        );
    await pumpReader(tester);

    expect(find.text('The science of sleep'), findsOneWidget);
    await tester.tapAt(firstWord(tester));
    await tester.pumpAndSettle();

    expect(find.text('o, a'), findsOneWidget);
    expect(find.text('The house is big.'), findsOneWidget);
    await tester.tap(find.text('Salvar palavra'));
    await tester.pumpAndSettle();
    expect(find.text('Palavra salva'), findsOneWidget);
    verify(() => vocabulary.list()).called(2); // sublinhado das salvas atualizado
  });

  testWidgets('segurar escolhe a frase inteira e já traduz', (tester) async {
    when(() => vocabulary.translateSentence(articleId: 10, text: 'The house is big.'))
        .thenAnswer((_) async => 'A casa é grande.');
    await pumpReader(tester);

    await tester.longPressAt(firstWord(tester));
    await tester.pumpAndSettle();

    expect(find.text('FRASE'), findsOneWidget);
    expect(find.text('A casa é grande.'), findsOneWidget);
  });

  testWidgets('concluir rápido demais mostra quanto falta, com calma', (tester) async {
    await pumpReader(tester);
    await tester.scrollUntilVisible(find.text('Concluir leitura'), 300);
    await tester.tap(find.text('Concluir leitura'));
    await tester.pumpAndSettle();

    expect(find.textContaining('leia com calma'), findsOneWidget);
  });

  testWidgets('texto já concluído ao abrir: "Você já concluiu este texto"', (tester) async {
    when(() => reading.article(10))
        .thenAnswer((_) async => articleDetail(completed: true, progress: 100));
    await pumpReader(tester);
    await tester.scrollUntilVisible(find.text('Você já concluiu este texto'), 300);
    expect(find.text('Concluir leitura'), findsNothing);
  });

  group('conclusão', () {
    Future<CompletionAction?> pumpCompletion(
      WidgetTester tester, {
      GoalStatus? goal = goalDone,
      SessionGains gains = const SessionGains(
        xp: 64,
        words: 400,
        goalMet: true,
        streakUp: true,
        streak: 7,
      ),
      bool streakHidden = false,
      bool reduceMotion = false,
    }) async {
      phone(tester);
      if (reduceMotion) {
        tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(
          disableAnimations: true,
        );
        addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
      }
      CompletionAction? result;
      await tester.pumpWidget(
        wrapApp(
          Builder(
            builder: (context) => Builder(
              builder: (context) => Builder(
                builder: (context) => Center(
                  child: TextButton(
                    onPressed: () async {
                      result = await Navigator.of(context).push<CompletionAction>(
                        MaterialPageRoute(
                          builder: (_) => CompletionScreen(
                            articleTitle: 'Texto',
                            minutes: 4,
                            gains: gains,
                            goal: goal,
                            longestStreak: 10,
                            primaryLabel: 'Próximo texto',
                            secondaryLabel: 'Ver mais textos',
                            pick: 0,
                          ),
                        ),
                      );
                    },
                    child: const Text('abrir'),
                  ),
                ),
              ),
            ),
          ),
          streakHidden: streakHidden,
        ),
      );
      await tester.tap(find.text('abrir'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50)); // a rota monta a tela no quadro seguinte
      return result;
    }

    testWidgets('meta vira nesta leitura: anel enche, fica verde e solta confete', (tester) async {
      // antes: 220 de 500; depois: 620 (cruza a meta)
      await pumpCompletion(tester);
      expect(find.text('Faltam 0 palavras'), findsOneWidget);
      expect(find.byType(Confetti), findsNothing);

      // 500 ms de espera, depois o anel enche (o ticker só anda quadro a quadro)
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pump(const Duration(milliseconds: 900));
      await tester.pump(); // o anel avisa depois do quadro
      expect(find.text('Meta de hoje cumprida'), findsOneWidget);
      expect(find.byType(Confetti), findsOneWidget);
      expect(find.text('7 dias seguidos!'), findsOneWidget);
      expect(find.text('Uma semana inteira lendo em inglês.'), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('reduzir movimento: meta já verde, sem confete', (tester) async {
      await pumpCompletion(tester, reduceMotion: true);
      await tester.pumpAndSettle();
      expect(find.text('Meta de hoje cumprida'), findsOneWidget);
      expect(find.byKey(const ValueKey('confetti')), findsNothing);
    });

    testWidgets('ofensiva escondida no Perfil: sem cartão nem marco de ofensiva', (tester) async {
      await pumpCompletion(tester, streakHidden: true);
      await tester.pumpAndSettle();
      expect(find.textContaining('de ofensiva'), findsNothing);
      expect(find.text('7 dias seguidos!'), findsNothing);
    });

    testWidgets('"Terminar por hoje" leva ao "Até amanhã" e de lá ao início', (tester) async {
      CompletionAction? result;
      phone(tester);
      await tester.pumpWidget(
        wrapApp(
          Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await Navigator.of(context).push<CompletionAction>(
                  MaterialPageRoute(
                    builder: (_) => const CompletionScreen(
                      articleTitle: 'Texto',
                      minutes: 4,
                      gains: SessionGains(streak: 7),
                      goal: goalDone,
                      longestStreak: 10,
                      primaryLabel: null,
                      secondaryLabel: 'Voltar ao livro',
                      pick: 0,
                    ),
                  ),
                );
              },
              child: const Text('abrir'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('abrir'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Terminar por hoje'));
      await tester.pumpAndSettle();
      expect(find.text('Até amanhã!'), findsOneWidget);
      expect(find.textContaining('ofensiva de 7 dias garantida'), findsOneWidget);

      await tester.tap(find.text('Voltar ao início'));
      await tester.pumpAndSettle();
      expect(result, CompletionAction.finishForToday);
    });

    testWidgets('meta ainda aberta: sem "Terminar por hoje"', (tester) async {
      await pumpCompletion(
        tester,
        goal: goalOpen,
        gains: const SessionGains(xp: 9, words: 60, streak: 3),
      );
      await tester.pumpAndSettle();
      expect(find.text('Terminar por hoje'), findsNothing);
      expect(find.text('Faltam 180 palavras'), findsOneWidget);
    });
  });
}
