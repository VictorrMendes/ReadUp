part of 'auth_bloc.dart';

sealed class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// App abriu: há token guardado?
final class AuthStarted extends AuthEvent {
  const AuthStarted();
}

final class LoginRequested extends AuthEvent {
  const LoginRequested({required this.email, required this.password});

  final String email;
  final String password;

  @override
  List<Object?> get props => [email, password];
}

final class RegisterRequested extends AuthEvent {
  const RegisterRequested({required this.name, required this.email, required this.password});

  final String name;
  final String email;
  final String password;

  @override
  List<Object?> get props => [name, email, password];
}

/// Recarrega o usuário (depois do onboarding, de mudar nível/meta, ou "tentar novamente").
final class UserRefreshRequested extends AuthEvent {
  const UserRefreshRequested();
}

final class LogoutRequested extends AuthEvent {
  const LogoutRequested();
}

/// Um 401 em qualquer chamada: o token não vale mais.
final class SessionExpired extends AuthEvent {
  const SessionExpired();
}
