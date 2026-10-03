import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../home_tabs/presentation/screens/home_tabs_screen.dart';
import '../../../onboarding/presentation/screens/onboarding_screen.dart';
import '../blocs/auth_bloc.dart';
import 'auth_screen.dart';
import 'splash_screen.dart';
import 'user_load_error_screen.dart';

/// Entrada do app: a tela segue o estado da sessão.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      // enviar o formulário não troca de tela (o próprio formulário mostra progresso e erro)
      buildWhen: (previous, current) => _screenOf(previous) != _screenOf(current),
      builder: (context, state) => switch (state) {
        AuthInitial() => const SplashScreen(),
        AuthUserLoadFailure(:final message) => UserLoadErrorScreen(message: message),
        AuthAuthenticated(:final user) when !user.isOnboarded => OnboardingScreen(user: user),
        AuthAuthenticated(:final user) => HomeTabsScreen(user: user),
        AuthUnauthenticated() || AuthInProgress() || AuthFailure() => const AuthScreen(),
      },
    );
  }

  static Object _screenOf(AuthState state) => switch (state) {
    AuthAuthenticated(:final user) => (user.isOnboarded, user),
    AuthUnauthenticated() || AuthInProgress() || AuthFailure() => AuthScreen,
    _ => state.runtimeType,
  };
}
