import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/services/reminders.dart';
import '../../../../shared/domain/constants/levels.dart';
import '../../../../shared/domain/repositories/preferences_repository.dart';

class OnboardingState extends Equatable {
  const OnboardingState({
    this.level,
    this.goal,
    this.reminder = defaultReminder,
    this.saving = false,
    this.error,
    this.done = false,
  });

  final EnglishLevel? level;
  final int? goal;
  final ReminderTime reminder;
  final bool saving;
  final String? error;

  /// Salvou nível e meta: a tela pede ao AuthBloc para recarregar o usuário.
  final bool done;

  bool get canStart => level != null && goal != null && !saving;

  OnboardingState copyWith({
    EnglishLevel? level,
    int? goal,
    ReminderTime? reminder,
    bool? saving,
    String? Function()? error,
    bool? done,
  }) => OnboardingState(
    level: level ?? this.level,
    goal: goal ?? this.goal,
    reminder: reminder ?? this.reminder,
    saving: saving ?? this.saving,
    error: error != null ? error() : this.error,
    done: done ?? this.done,
  );

  @override
  List<Object?> get props => [level, goal, reminder, saving, error, done];
}

class OnboardingCubit extends Cubit<OnboardingState> {
  OnboardingCubit({
    required this._repository,
    required this._reminders,
    EnglishLevel? level,
    int? goal,
  }) : super(OnboardingState(level: level, goal: goal));

  final PreferencesRepository _repository;
  final Reminders _reminders;

  void levelSelected(EnglishLevel level) => emit(state.copyWith(level: level));

  void goalSelected(int goal) => emit(state.copyWith(goal: goal));

  void reminderSelected(ReminderTime time) => emit(state.copyWith(reminder: time));

  Future<void> startRequested() async {
    final level = state.level;
    final goal = state.goal;
    if (level == null || goal == null || state.saving) return;
    emit(state.copyWith(saving: true, error: () => null));
    try {
      await _repository.setLevel(level);
      await _repository.setGoal(goal);
      // pede a permissão aqui, logo depois da escolha (negada: segue sem lembrete)
      await _reminders.set(state.reminder);
      emit(state.copyWith(saving: false, done: true));
    } on RequestFailure catch (failure) {
      emit(state.copyWith(saving: false, error: () => failure.message));
    }
  }
}
