import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../domain/models/user.dart';
import '../../domain/repositories/auth_repository.dart';

part 'auth_event.dart';
part 'auth_state.dart';

/// Sessão do app: token guardado → usuário carregado → onboarding ou abas (o AuthGate decide).
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({required this._repository}) : super(const AuthInitial()) {
    on<AuthStarted>(_onStarted);
    on<LoginRequested>(_onLoginRequested);
    on<RegisterRequested>(_onRegisterRequested);
    on<UserRefreshRequested>(_onUserRefreshRequested);
    on<LogoutRequested>(_onLogoutRequested);
    on<SessionExpired>(_onSessionExpired);
  }

  final AuthRepository _repository;

  Future<void> _onStarted(AuthStarted event, Emitter<AuthState> emit) async {
    if (!await _repository.hasToken()) return emit(const AuthUnauthenticated());
    await _loadUser(emit);
  }

  Future<void> _onLoginRequested(LoginRequested event, Emitter<AuthState> emit) =>
      _submit(emit, () => _repository.login(email: event.email, password: event.password));

  Future<void> _onRegisterRequested(RegisterRequested event, Emitter<AuthState> emit) => _submit(
    emit,
    () => _repository.register(name: event.name, email: event.email, password: event.password),
  );

  Future<void> _onUserRefreshRequested(UserRefreshRequested event, Emitter<AuthState> emit) =>
      _loadUser(emit);

  Future<void> _onLogoutRequested(LogoutRequested event, Emitter<AuthState> emit) async {
    await _repository.logout();
    emit(const AuthUnauthenticated());
  }

  Future<void> _onSessionExpired(SessionExpired event, Emitter<AuthState> emit) async {
    if (state is AuthUnauthenticated) return;
    await _repository.logout();
    emit(const AuthUnauthenticated());
  }

  Future<void> _submit(Emitter<AuthState> emit, Future<void> Function() action) async {
    emit(const AuthInProgress());
    try {
      await action();
      emit(AuthAuthenticated(await _repository.me()));
    } on RequestFailure catch (failure) {
      emit(AuthFailure(failure.message));
    }
  }

  Future<void> _loadUser(Emitter<AuthState> emit) async {
    try {
      emit(AuthAuthenticated(await _repository.me()));
    } on RequestFailure catch (failure) {
      if (failure.isUnauthorized) {
        await _repository.logout();
        return emit(const AuthUnauthenticated());
      }
      // sem rede ou servidor fora: o token continua; a tela oferece "tentar novamente"
      emit(AuthUserLoadFailure(failure.message));
    }
  }
}
