import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/routes/routes.dart';
import 'design_system/themes.dart';
import 'features/auth/domain/repositories/auth_repository.dart';
import 'features/auth/presentation/blocs/auth_bloc.dart';
import 'features/auth/presentation/screens/auth_gate.dart';
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
    required this.streakVisibility,
  });

  final AuthBloc authBloc;
  final AuthRepository authRepository;
  final PreferencesRepository preferencesRepository;
  final StatsRepository statsRepository;
  final ArticlesRepository articlesRepository;
  final StreakVisibilityCubit streakVisibility;

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider.value(value: authRepository),
        RepositoryProvider.value(value: preferencesRepository),
        RepositoryProvider.value(value: statsRepository),
        RepositoryProvider.value(value: articlesRepository),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider.value(value: authBloc),
          BlocProvider.value(value: streakVisibility),
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
