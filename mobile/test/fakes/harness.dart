import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/design_system/themes.dart';
import 'package:readup/features/auth/presentation/blocs/auth_bloc.dart';
import 'package:readup/core/services/reminders.dart';
import 'package:readup/core/services/speech.dart';
import 'package:readup/features/read/domain/repositories/books_repository.dart';
import 'package:readup/features/reader/domain/models/reader_settings.dart';
import 'package:readup/features/reader/domain/repositories/reading_repository.dart';
import 'package:readup/features/reader/presentation/cubits/reader_settings_cubit.dart';
import 'package:readup/shared/domain/repositories/vocabulary_repository.dart';
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
  BooksRepository? books,
  ReadingRepository? reading,
  VocabularyRepository? vocabulary,
  Speech? speech,
  Reminders? reminders,
  ReaderSettings readerSettings = const ReaderSettings(),
  bool? streakHidden = false,
  Map<String, WidgetBuilder> routes = const {},
}) {
  final visibility = MockStreakVisibilityCubit();
  when(() => visibility.state).thenReturn(streakHidden);
  final settingsCubit = MockReaderSettingsCubit();
  when(() => settingsCubit.state).thenReturn(readerSettings);
  return MultiRepositoryProvider(
    providers: [
      RepositoryProvider<StatsRepository>.value(value: stats ?? _pendingStats()),
      RepositoryProvider<ArticlesRepository>.value(value: articles ?? _pendingArticles()),
      RepositoryProvider<ReadingRepository>.value(value: reading ?? MockReadingRepository()),
      RepositoryProvider<VocabularyRepository>.value(
        value: vocabulary ?? MockVocabularyRepository(),
      ),
      RepositoryProvider<Speech>.value(value: speech ?? MockSpeech()),
      RepositoryProvider<Reminders>.value(value: reminders ?? quietReminders()),
      RepositoryProvider<BooksRepository>.value(value: books ?? _pendingBooks()),
      RepositoryProvider<PreferencesRepository>.value(
        value: preferences ?? MockPreferencesRepository(),
      ),
    ],
    child: MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>.value(value: authBloc ?? MockAuthBloc()),
        BlocProvider<StreakVisibilityCubit>.value(value: visibility),
        BlocProvider<ReaderSettingsCubit>.value(value: settingsCubit),
      ],
      child: MaterialApp(theme: mainTheme, home: home, routes: routes),
    ),
  );
}

/// Lembretes que aceitam tudo (noite, permissão concedida) e não agendam nada.
MockReminders quietReminders() {
  registerFallbackValue(ReminderTime.off);
  final reminders = MockReminders();
  when(reminders.current).thenAnswer((_) async => ReminderTime.evening);
  when(() => reminders.set(any())).thenAnswer((_) async => true);
  when(
    () => reminders.sync(
      doneToday: any(named: 'doneToday'),
      streak: any(named: 'streak'),
    ),
  ).thenAnswer((_) async {});
  when(reminders.cancelAll).thenAnswer((_) async {});
  return reminders;
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

BooksRepository _pendingBooks() {
  final books = MockBooksRepository();
  when(() => books.list()).thenAnswer((_) => Completer<Never>().future);
  return books;
}

ArticlesRepository _pendingArticles() {
  final articles = MockArticlesRepository();
  when(() => articles.continueReading()).thenAnswer((_) => Completer<Never>().future);
  when(
    () => articles.list(
      level: any(named: 'level'),
      category: any(named: 'category'),
    ),
  ).thenAnswer((_) => Completer<Never>().future);
  return articles;
}
