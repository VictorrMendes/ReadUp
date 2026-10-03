import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/features/auth/domain/repositories/auth_repository.dart';
import 'package:readup/features/auth/presentation/blocs/auth_bloc.dart';
import 'package:readup/shared/domain/repositories/preferences_repository.dart';

class MockHttpHelper extends Mock implements HttpHelper {}

class MockAuthRepository extends Mock implements AuthRepository {}

class MockPreferencesRepository extends Mock implements PreferencesRepository {}

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}
