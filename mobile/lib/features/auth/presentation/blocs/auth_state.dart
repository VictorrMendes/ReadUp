part of 'auth_bloc.dart';

sealed class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// Lendo o token: a abertura fica na tela (sem piscar o login).
final class AuthInitial extends AuthState {
  const AuthInitial();
}

final class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// Enviando login ou cadastro.
final class AuthInProgress extends AuthState {
  const AuthInProgress();
}

/// Login ou cadastro recusado (credenciais, e-mail já usado, sem rede).
final class AuthFailure extends AuthState {
  const AuthFailure(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}

final class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.user);

  final User user;

  @override
  List<Object?> get props => [user];
}

/// Token guardado, mas o usuário não carregou (sem rede/servidor fora).
final class AuthUserLoadFailure extends AuthState {
  const AuthUserLoadFailure(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}
