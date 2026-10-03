import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/features/home/presentation/screens/home_screen.dart';
import 'package:readup/features/home/presentation/widgets/week_strip.dart';
import 'package:readup/features/home_tabs/presentation/screens/home_tabs_screen.dart';
import 'package:readup/core/core.dart';
import 'package:readup/shared/domain/models/achievement.dart';
import 'package:readup/shared/domain/models/article_summary.dart';
import 'package:readup/shared/domain/models/stats.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/harness.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockStatsRepository stats;
  late MockArticlesRepository articles;

  void stub({
    GoalStatus goal = goalOpen,
    ArticleSummary? reading,
    StatsSummary? summary,
    List<Achievement> achievements = const [achievementWords],
    List<ArticleSummary> feed = const [],
  }) {
    stats = MockStatsRepository();
    articles = MockArticlesRepository();
    when(() => stats.goal()).thenAnswer((_) async => goal);
    when(() => stats.summary()).thenAnswer((_) async => summary ?? summaryWith());
    when(() => stats.daily()).thenAnswer((_) async => week);
    when(() => stats.achievements()).thenAnswer((_) async => achievements);
    when(() => articles.continueReading()).thenAnswer((_) async => reading);
    when(() => articles.list(level: any(named: 'level'))).thenAnswer((_) async => feed);
  }

  Future<void> pumpHome(WidgetTester tester, {bool streakHidden = false}) async {
    // celular alto: o Início inteiro cabe na tela (toques e semântica alcançam todos os cartões)
    tester.view.physicalSize = const Size(1080, 4000);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      wrapApp(
        HomeTabsScreen(user: onboardedUser),
        stats: stats,
        articles: articles,
        streakHidden: streakHidden,
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('meta aberta, ofensiva, próxima conquista e continuar lendo', (tester) async {
    stub(reading: article(progress: 40));
    await pumpHome(tester);

    expect(find.text('Olá, Ana'), findsOneWidget);
    expect(find.text('Faltam 180 palavras para fechar a meta.'), findsOneWidget);
    expect(find.text('64%'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Continuar leitura'), findsOneWidget);
    expect(find.text('3 dias'), findsOneWidget);
    expect(find.text('2 escudos · cobrem dias sem leitura'), findsOneWidget);
    expect(find.text('Mil palavras'), findsOneWidget);
    expect(find.text('Continuar lendo'), findsOneWidget);
    expect(find.text('The science of sleep'), findsOneWidget);
  });

  testWidgets('meta cumprida: chama dourada e "Ler mais um"', (tester) async {
    stub(goal: goalDone, reading: article(progress: 40));
    await pumpHome(tester);

    expect(find.byKey(const ValueKey('gold-flame')), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Ler mais um'), findsOneWidget);
    expect(find.textContaining('extras'), findsOneWidget);
  });

  testWidgets('ofensiva escondida no Perfil: sem cartão de ofensiva', (tester) async {
    stub(reading: article(progress: 40));
    await pumpHome(tester, streakHidden: true);

    expect(find.text('3 dias'), findsNothing);
    expect(find.text('Mil palavras'), findsOneWidget);
  });

  testWidgets('ofensiva quebrada: recomeço sem culpa e o total em destaque', (tester) async {
    stub(
      reading: article(progress: 40),
      summary: summaryWith(streak: 0, longest: 12, active: false),
    );
    await pumpHome(tester);

    expect(find.text('Acontece. Recomece hoje · recorde de 12 dias salvo'), findsOneWidget);
    expect(find.textContaining('18.400'), findsOneWidget);
    expect(find.textContaining('escudo'), findsNothing);
  });

  testWidgets('faixa da semana: verde para meta, laranja para leitura, tracejado hoje', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    stub(reading: article(progress: 40));
    await pumpHome(tester);

    expect(find.byKey(const ValueKey('day-met')), findsNWidgets(2));
    expect(find.byKey(const ValueKey('day-kept')), findsNWidgets(2));
    expect(find.byKey(const ValueKey('day-missed')), findsNWidgets(2));
    expect(find.byKey(const ValueKey('day-pending')), findsOneWidget);
    expect(
      tester.getSemantics(find.byType(WeekStrip)).label,
      'Últimos 7 dias: leu em 4, meta batida em 2; hoje pendente',
    );
    semantics.dispose();
  });

  testWidgets('sem nada a sugerir: "Ver textos" leva à aba Ler', (tester) async {
    stub();
    await pumpHome(tester);

    expect(find.text('Você já leu todos os textos do seu nível.'), findsOneWidget);
    final button = find.widgetWithText(FilledButton, 'Ver textos');
    await tester.ensureVisible(button);
    await tester.tap(button);
    await tester.pumpAndSettle();

    // a aba Ler está na frente (o Início fica fora da tela, no IndexedStack)
    expect(find.text('Ler chega na fase 3.'), findsOneWidget);
    expect(find.byType(HomeScreen), findsNothing);
  });

  testWidgets('erro: mensagem e tentar novamente', (tester) async {
    stub(reading: article(progress: 40));
    when(
      () => stats.goal(),
    ).thenAnswer((_) async => throw const RequestFailure(message: 'Sem conexão com o servidor.'));
    await pumpHome(tester);

    expect(find.text('Sem conexão com o servidor.'), findsOneWidget);
    when(() => stats.goal()).thenAnswer((_) async => goalOpen);
    await tester.tap(find.text('Tentar novamente'));
    await tester.pumpAndSettle();

    expect(find.text('Faltam 180 palavras para fechar a meta.'), findsOneWidget);
  });
}
