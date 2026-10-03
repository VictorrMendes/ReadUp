import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/routes/routes.dart';
import 'design_system/themes.dart';
import 'features/auth/domain/repositories/auth_repository.dart';
import 'features/auth/presentation/blocs/auth_bloc.dart';
import 'features/auth/presentation/screens/auth_gate.dart';
import 'core/services/reminders.dart';
import 'core/services/speech.dart';
import 'features/read/domain/repositories/books_repository.dart';
import 'features/reader/domain/repositories/reading_repository.dart';
import 'features/reader/presentation/cubits/reader_settings_cubit.dart';
import 'shared/domain/repositories/vocabulary_repository.dart';
import 'shared/domain/repositories/articles_repository.dart';
import 'shared/domain/repositories/preferences_repository.dart';
import 'shared/domain/repositories/stats_repository.dart';
import 'shared/presentation/cubits/streak_visibility_cubit.dart';

/// Widget raiz: repositórios e sessão disponíveis para a árvore, tema, locale pt-BR e rotas.
class ReadUpApp extends StatelessWidget {
  const ReadUpApp({
    super.key,
    required this.authBloc,
    required this.authRepository,
    required this.preferencesRepository,
    required this.statsRepository,
    required this.articlesRepository,
    required this.booksRepository,
    required this.readingRepository,
    required this.vocabularyRepository,
    required this.speech,
    required this.reminders,
    required this.streakVisibility,
    required this.readerSettings,
  });

  final AuthBloc authBloc;
  final AuthRepository authRepository;
  final PreferencesRepository preferencesRepository;
  final StatsRepository statsRepository;
  final ArticlesRepository articlesRepository;
  final BooksRepository booksRepository;
  final ReadingRepository readingRepository;
  final VocabularyRepository vocabularyRepository;
  final Speech speech;
  final Reminders reminders;
  final ReaderSettingsCubit readerSettings;
  final StreakVisibilityCubit streakVisibility;

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider.value(value: authRepository),
        RepositoryProvider.value(value: preferencesRepository),
        RepositoryProvider.value(value: statsRepository),
        RepositoryProvider.value(value: articlesRepository),
        RepositoryProvider.value(value: booksRepository),
        RepositoryProvider.value(value: readingRepository),
        RepositoryProvider.value(value: vocabularyRepository),
        RepositoryProvider.value(value: speech),
        RepositoryProvider.value(value: reminders),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider.value(value: authBloc),
          BlocProvider.value(value: streakVisibility),
          BlocProvider.value(value: readerSettings),
        ],
        child: MaterialApp(
          title: 'ReadUp',
          debugShowCheckedModeBanner: false,
          theme: mainTheme,
          locale: const Locale('pt', 'BR'),
          supportedLocales: const [Locale('pt', 'BR')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          home: const AuthGate(),
          routes: Routes.pages,
        ),
      ),
    );
  }
}
