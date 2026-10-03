import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/features/home/presentation/blocs/home_bloc.dart';
import 'package:readup/shared/domain/constants/levels.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockStatsRepository stats;
  late MockArticlesRepository articles;

  setUp(() {
    stats = MockStatsRepository();
    articles = MockArticlesRepository();
    when(() => stats.goal()).thenAnswer((_) async => goalOpen);
    when(() => stats.summary()).thenAnswer((_) async => summaryWith());
    when(() => stats.daily()).thenAnswer((_) async => week);
    when(() => stats.achievements()).thenAnswer((_) async => [achievementWords]);
  });

  HomeBloc build() => HomeBloc(stats: stats, articles: articles);
  const load = HomeLoadRequested(level: EnglishLevel.b1);

  blocTest<HomeBloc, HomeState>(
    'com texto em andamento: carrega tudo e não busca sugestão',
    setUp: () =>
        when(() => articles.continueReading()).thenAnswer((_) async => article(progress: 40)),
    build: build,
    act: (bloc) => bloc.add(load),
    expect: () => [
      HomeLoaded(
        HomeData(
          goal: goalOpen,
          continueReading: article(progress: 40),
          suggestion: null,
          summary: summaryWith(),
          week: week,
          achievements: const [achievementWords],
        ),
      ),
    ],
    verify: (_) => verifyNever(() => articles.list(level: any(named: 'level'))),
  );

  blocTest<HomeBloc, HomeState>(
    'sem texto em andamento: sugere o próximo do nível',
    setUp: () {
      when(() => articles.continueReading()).thenAnswer((_) async => null);
      when(() => articles.list(level: EnglishLevel.b1))
          .thenAnswer((_) async => [article(id: 1, completed: true), article(id: 2)]);
    },
    build: build,
    act: (bloc) => bloc.add(load),
    verify: (bloc) => expect((bloc.state as HomeLoaded).data.readTarget?.id, 2),
  );

  blocTest<HomeBloc, HomeState>(
    'resumo/semana/conquistas falhando só somem (o Início abre mesmo assim)',
    setUp: () {
      when(() => articles.continueReading()).thenAnswer((_) async => article(progress: 40));
      when(() => stats.summary()).thenAnswer((_) async => throw const RequestFailure());
      when(() => stats.daily()).thenAnswer((_) async => throw const RequestFailure());
    },
    build: build,
    act: (bloc) => bloc.add(load),
    verify: (bloc) {
      final data = (bloc.state as HomeLoaded).data;
      expect(data.summary, isNull);
      expect(data.week, isNull);
      expect(data.achievements, isNotEmpty);
    },
  );

  blocTest<HomeBloc, HomeState>(
    'meta ou "continuar lendo" falhando: erro com a mensagem',
    setUp: () {
      when(() => articles.continueReading()).thenAnswer((_) async => null);
      when(() => stats.goal())
          .thenAnswer((_) async => throw const RequestFailure(message: 'Sem conexão'));
    },
    build: build,
    act: (bloc) => bloc.add(load),
    expect: () => [const HomeFailure('Sem conexão')],
  );

  blocTest<HomeBloc, HomeState>(
    'recarga que falha mantém os dados que já estavam na tela',
    setUp: () {
      when(() => articles.continueReading()).thenAnswer((_) async => null);
      when(() => articles.list(level: any(named: 'level'))).thenAnswer((_) async => []);
      when(() => stats.goal()).thenAnswer((_) async => throw const RequestFailure());
    },
    build: build,
    seed: () => const HomeLoaded(HomeData(goal: goalDone, continueReading: null, suggestion: null)),
    act: (bloc) => bloc.add(load),
    expect: () => <HomeState>[],
  );
}
