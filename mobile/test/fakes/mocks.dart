import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/features/auth/domain/repositories/auth_repository.dart';
import 'package:readup/features/auth/presentation/blocs/auth_bloc.dart';
import 'package:readup/shared/domain/repositories/articles_repository.dart';
import 'package:readup/shared/domain/repositories/preferences_repository.dart';
import 'package:readup/shared/domain/repositories/stats_repository.dart';
import 'package:readup/shared/presentation/cubits/streak_visibility_cubit.dart';

class MockHttpHelper extends Mock implements HttpHelper {}

class MockAuthRepository extends Mock implements AuthRepository {}

class MockPreferencesRepository extends Mock implements PreferencesRepository {}

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}

class MockStatsRepository extends Mock implements StatsRepository {}

class MockArticlesRepository extends Mock implements ArticlesRepository {}

class MockStreakVisibilityCubit extends MockCubit<bool?> implements StreakVisibilityCubit {}
