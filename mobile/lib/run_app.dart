import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

import 'app.dart';
import 'build_config.dart';
import 'core/core.dart';
import 'features/auth/domain/repositories/auth_repository.dart';
import 'features/auth/presentation/blocs/auth_bloc.dart';
import 'features/read/domain/repositories/books_repository.dart';
import 'shared/domain/repositories/articles_repository.dart';
import 'shared/domain/repositories/preferences_repository.dart';
import 'shared/domain/repositories/stats_repository.dart';
import 'shared/presentation/cubits/streak_visibility_cubit.dart';

/// Inicialização comum aos entrypoints: monta as dependências a partir do [config] e abre o app.
Future<void> runReadUp(BuildConfig config) async {
  WidgetsFlutterBinding.ensureInitialized();
  Intl.defaultLocale = 'pt_BR';
  await initializeDateFormatting('pt_BR');

  final tokenStorage = SecureTokenStorage();
  // o 401 de qualquer chamada encerra a sessão (o AuthBloc é criado logo abaixo)
  late final AuthBloc authBloc;
  final httpHelper = HttpHelperImpl(
    baseUrl: config.apiUrl,
    client: http.Client(),
    tokenStorage: tokenStorage,
    onUnauthorized: () => authBloc.add(const SessionExpired()),
  );
  final authRepository = AuthRepository(httpHelper: httpHelper, tokenStorage: tokenStorage);
  authBloc = AuthBloc(repository: authRepository)..add(const AuthStarted());
  final streakVisibility = StreakVisibilityCubit();
  unawaited(streakVisibility.load());

  runApp(
    ReadUpApp(
      authBloc: authBloc,
      authRepository: authRepository,
      preferencesRepository: PreferencesRepository(httpHelper: httpHelper),
      statsRepository: StatsRepository(httpHelper: httpHelper),
      articlesRepository: ArticlesRepository(httpHelper: httpHelper),
      booksRepository: BooksRepository(httpHelper: httpHelper),
      streakVisibility: streakVisibility,
    ),
  );
}
