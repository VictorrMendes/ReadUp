import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/design_system/themes.dart';
import 'package:readup/features/auth/presentation/blocs/auth_bloc.dart';
import 'package:readup/shared/domain/repositories/articles_repository.dart';
import 'package:readup/shared/domain/repositories/preferences_repository.dart';
import 'package:readup/shared/domain/repositories/stats_repository.dart';
import 'package:readup/shared/presentation/cubits/streak_visibility_cubit.dart';

import 'mocks.dart';

/// Monta [home] com as dependências do app (mocks por padrão), tema e rotas.
Widget wrapApp(
  Widget home, {
  AuthBloc? authBloc,
  StatsRepository? stats,
  ArticlesRepository? articles,
  PreferencesRepository? preferences,
  bool? streakHidden = false,
  Map<String, WidgetBuilder> routes = const {},
}) {
  final visibility = MockStreakVisibilityCubit();
  when(() => visibility.state).thenReturn(streakHidden);
  return MultiRepositoryProvider(
    providers: [
      RepositoryProvider<StatsRepository>.value(value: stats ?? _pendingStats()),
      RepositoryProvider<ArticlesRepository>.value(value: articles ?? _pendingArticles()),
      RepositoryProvider<PreferencesRepository>.value(
        value: preferences ?? MockPreferencesRepository(),
      ),
    ],
    child: MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>.value(value: authBloc ?? MockAuthBloc()),
        BlocProvider<StreakVisibilityCubit>.value(value: visibility),
      ],
      child: MaterialApp(theme: mainTheme, home: home, routes: routes),
    ),
  );
}

// chamadas que nunca terminam: a tela fica no carregamento (testes que não olham os dados)
StatsRepository _pendingStats() {
  final stats = MockStatsRepository();
  when(() => stats.goal()).thenAnswer((_) => Completer<Never>().future);
  when(() => stats.summary()).thenAnswer((_) => Completer<Never>().future);
  when(() => stats.daily(days: any(named: 'days'))).thenAnswer((_) => Completer<Never>().future);
  when(() => stats.achievements()).thenAnswer((_) => Completer<Never>().future);
  return stats;
}

ArticlesRepository _pendingArticles() {
  final articles = MockArticlesRepository();
  when(() => articles.continueReading()).thenAnswer((_) => Completer<Never>().future);
  return articles;
}
