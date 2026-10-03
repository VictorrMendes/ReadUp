import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/features/auth/presentation/blocs/auth_bloc.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockAuthRepository repository;

  setUp(() {
    repository = MockAuthRepository();
    when(() => repository.logout()).thenAnswer((_) async {});
  });

  AuthBloc build() => AuthBloc(repository: repository);

  group('ao abrir', () {
    blocTest<AuthBloc, AuthState>(
      'sem token: vai para o login',
      setUp: () => when(() => repository.hasToken()).thenAnswer((_) async => false),
      build: build,
      act: (bloc) => bloc.add(const AuthStarted()),
      expect: () => [const AuthUnauthenticated()],
    );

    blocTest<AuthBloc, AuthState>(
      'com token: carrega o usuário',
      setUp: () {
        when(() => repository.hasToken()).thenAnswer((_) async => true);
        when(() => repository.me()).thenAnswer((_) async => onboardedUser);
      },
      build: build,
      act: (bloc) => bloc.add(const AuthStarted()),
      expect: () => [const AuthAuthenticated(onboardedUser)],
    );

    blocTest<AuthBloc, AuthState>(
      'token vencido (401): apaga e vai para o login',
      setUp: () {
        when(() => repository.hasToken()).thenAnswer((_) async => true);
        when(() => repository.me()).thenThrow(const RequestFailure(code: 401));
      },
      build: build,
      act: (bloc) => bloc.add(const AuthStarted()),
      expect: () => [const AuthUnauthenticated()],
      verify: (_) => verify(() => repository.logout()).called(1),
    );

    blocTest<AuthBloc, AuthState>(
      'sem rede: mantém o token e oferece tentar de novo',
      setUp: () {
        when(() => repository.hasToken()).thenAnswer((_) async => true);
        when(() => repository.me()).thenThrow(const RequestFailure(message: 'Sem conexão'));
      },
      build: build,
      act: (bloc) => bloc.add(const AuthStarted()),
      expect: () => [const AuthUserLoadFailure('Sem conexão')],
      verify: (_) => verifyNever(() => repository.logout()),
    );
  });

  blocTest<AuthBloc, AuthState>(
    'login certo: envia, carrega o usuário e entra',
    setUp: () {
      when(() => repository.login(email: 'ana@example.com', password: 'segredo123'))
          .thenAnswer((_) async {});
      when(() => repository.me()).thenAnswer((_) async => onboardedUser);
    },
    build: build,
    act: (bloc) => bloc.add(const LoginRequested(email: 'ana@example.com', password: 'segredo123')),
    expect: () => [const AuthInProgress(), const AuthAuthenticated(onboardedUser)],
  );

  blocTest<AuthBloc, AuthState>(
    'login recusado: mostra a mensagem do servidor',
    setUp: () => when(
      () => repository.login(
        email: any(named: 'email'),
        password: any(named: 'password'),
      ),
    ).thenThrow(const RequestFailure(message: 'E-mail ou senha incorretos', code: 401)),
    build: build,
    act: (bloc) => bloc.add(const LoginRequested(email: 'a@b.c', password: 'errada123')),
    expect: () => [const AuthInProgress(), const AuthFailure('E-mail ou senha incorretos')],
  );

  blocTest<AuthBloc, AuthState>(
    'cadastro: conta nova entra sem nível nem meta (o gate leva ao onboarding)',
    setUp: () {
      when(
        () => repository.register(
          name: any(named: 'name'),
          email: any(named: 'email'),
          password: any(named: 'password'),
        ),
      ).thenAnswer((_) async {});
      when(() => repository.me()).thenAnswer((_) async => newUser);
    },
    build: build,
    act: (bloc) => bloc.add(
      const RegisterRequested(name: 'Bia', email: 'bia@example.com', password: '12345678'),
    ),
    expect: () => [const AuthInProgress(), const AuthAuthenticated(newUser)],
  );

  blocTest<AuthBloc, AuthState>(
    'sair: apaga o token e volta ao login',
    build: build,
    seed: () => const AuthAuthenticated(onboardedUser),
    act: (bloc) => bloc.add(const LogoutRequested()),
    expect: () => [const AuthUnauthenticated()],
    verify: (_) => verify(() => repository.logout()).called(1),
  );

  blocTest<AuthBloc, AuthState>(
    'sessão expirada (401 em qualquer tela): volta ao login uma vez só',
    build: build,
    seed: () => const AuthAuthenticated(onboardedUser),
    act: (bloc) => bloc
      ..add(const SessionExpired())
      ..add(const SessionExpired()),
    expect: () => [const AuthUnauthenticated()],
    verify: (_) => verify(() => repository.logout()).called(1),
  );
}
