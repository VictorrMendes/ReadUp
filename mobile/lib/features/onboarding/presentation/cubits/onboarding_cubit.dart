import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../shared/domain/constants/levels.dart';
import '../../../../shared/domain/repositories/preferences_repository.dart';

class OnboardingState extends Equatable {
  const OnboardingState({
    this.level,
    this.goal,
    this.saving = false,
    this.error,
    this.done = false,
  });

  final EnglishLevel? level;
  final int? goal;
  final bool saving;
  final String? error;

  /// Salvou nível e meta: a tela pede ao AuthBloc para recarregar o usuário.
  final bool done;

  bool get canStart => level != null && goal != null && !saving;

  OnboardingState copyWith({
    EnglishLevel? level,
    int? goal,
    bool? saving,
    String? Function()? error,
    bool? done,
  }) => OnboardingState(
    level: level ?? this.level,
    goal: goal ?? this.goal,
    saving: saving ?? this.saving,
    error: error != null ? error() : this.error,
    done: done ?? this.done,
  );

  @override
  List<Object?> get props => [level, goal, saving, error, done];
}

class OnboardingCubit extends Cubit<OnboardingState> {
  OnboardingCubit({required this._repository, EnglishLevel? level, int? goal})
    : super(OnboardingState(level: level, goal: goal));

  final PreferencesRepository _repository;

  void levelSelected(EnglishLevel level) => emit(state.copyWith(level: level));

  void goalSelected(int goal) => emit(state.copyWith(goal: goal));

  Future<void> startRequested() async {
    final level = state.level;
    final goal = state.goal;
    if (level == null || goal == null || state.saving) return;
    emit(state.copyWith(saving: true, error: () => null));
    try {
      await _repository.setLevel(level);
      await _repository.setGoal(goal);
      emit(state.copyWith(saving: false, done: true));
    } on RequestFailure catch (failure) {
      emit(state.copyWith(saving: false, error: () => failure.message));
    }
  }
}
