import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/design_system/themes.dart';
import 'package:readup/features/auth/presentation/blocs/auth_bloc.dart';
import 'package:readup/features/auth/presentation/screens/auth_gate.dart';
import 'package:readup/shared/domain/repositories/preferences_repository.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockAuthBloc bloc;

  setUpAll(() => registerFallbackValue(const AuthStarted()));
  setUp(() => bloc = MockAuthBloc());

  Future<void> pumpGate(WidgetTester tester, AuthState state) async {
    when(() => bloc.state).thenReturn(state);
    await tester.pumpWidget(
      RepositoryProvider<PreferencesRepository>.value(
        value: MockPreferencesRepository(),
        child: BlocProvider<AuthBloc>.value(
          value: bloc,
          child: MaterialApp(theme: mainTheme, home: const AuthGate()),
        ),
      ),
    );
  }

  testWidgets('lendo o token: abertura', (tester) async {
    await pumpGate(tester, const AuthInitial());
    expect(find.text('ReadUp'), findsOneWidget);
    expect(find.text('Entrar'), findsNothing);
  });

  testWidgets('sem sessão: login; trocar para cadastro mostra o campo Nome', (tester) async {
    await pumpGate(tester, const AuthUnauthenticated());
    expect(find.text('Bem-vindo de volta'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Nome'), findsNothing);

    await tester.tap(find.textContaining('Não tem conta?'));
    await tester.pumpAndSettle();

    expect(find.text('Comece seu hábito diário de leitura.'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Nome'), findsOneWidget);
  });

  testWidgets('formulário valida no aparelho antes de enviar', (tester) async {
    await pumpGate(tester, const AuthUnauthenticated());

    await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await tester.pump();
    expect(find.text('Preencha todos os campos.'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, 'E-mail'), 'ana@example.com');
    await tester.enterText(find.widgetWithText(TextField, 'Senha'), 'curta');
    await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await tester.pump();
    expect(find.text('A senha deve ter pelo menos 8 caracteres.'), findsOneWidget);
    verifyNever(() => bloc.add(any()));

    await tester.enterText(find.widgetWithText(TextField, 'Senha'), 'segredo123');
    await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await tester.pump();
    verify(() => bloc.add(const LoginRequested(email: 'ana@example.com', password: 'segredo123')))
        .called(1);
  });

  testWidgets('erro do servidor aparece só depois de enviar', (tester) async {
    whenListen(
      bloc,
      Stream.fromIterable([const AuthFailure('E-mail ou senha incorretos')]),
      initialState: const AuthUnauthenticated(),
    );
    await tester.pumpWidget(
      RepositoryProvider<PreferencesRepository>.value(
        value: MockPreferencesRepository(),
        child: BlocProvider<AuthBloc>.value(
          value: bloc,
          child: MaterialApp(theme: mainTheme, home: const AuthGate()),
        ),
      ),
    );
    await tester.pump();
    expect(find.text('E-mail ou senha incorretos'), findsNothing);

    await tester.enterText(find.widgetWithText(TextField, 'E-mail'), 'ana@example.com');
    await tester.enterText(find.widgetWithText(TextField, 'Senha'), 'errada123');
    await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await tester.pump();
    expect(find.text('E-mail ou senha incorretos'), findsOneWidget);
  });

  testWidgets('conta sem nível/meta: onboarding', (tester) async {
    await pumpGate(tester, const AuthAuthenticated(newUser));
    expect(find.text('Vamos começar'), findsOneWidget);
  });

  testWidgets('conta com nível e meta: Início', (tester) async {
    await pumpGate(tester, const AuthAuthenticated(onboardedUser));
    expect(find.text('Olá, Ana'), findsOneWidget);
  });

  testWidgets('usuário não carregou: tentar novamente', (tester) async {
    await pumpGate(tester, const AuthUserLoadFailure('Sem conexão com o servidor.'));
    await tester.tap(find.text('Tentar novamente'));
    verify(() => bloc.add(const UserRefreshRequested())).called(1);
  });
}
