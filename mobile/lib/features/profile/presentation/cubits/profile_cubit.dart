import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/services/reminders.dart';
import '../../../../shared/domain/constants/levels.dart';
import '../../../../shared/domain/models/achievement.dart';
import '../../../../shared/domain/models/stats.dart';
import '../../../../shared/domain/repositories/preferences_repository.dart';
import '../../../../shared/domain/repositories/stats_repository.dart';

class ProfileState extends Equatable {
  const ProfileState({
    this.summary,
    this.week,
    this.achievements,
    this.statsError = false,
    this.saving = false,
    this.saved = false,
    this.error,
    this.reminder,
    this.reminderDenied = false,
  });

  final StatsSummary? summary;
  final List<DailyStat>? week;

  /// null: falhou só ela (a seção some)
  final List<Achievement>? achievements;
  final bool statsError;
  final bool saving;

  /// "Salvo" aparece e some sozinho
  final bool saved;
  final String? error;
  final ReminderTime? reminder;

  /// a pessoa negou as notificações no sistema
  final bool reminderDenied;

  ProfileState copyWith({
    StatsSummary? summary,
    List<DailyStat>? week,
    List<Achievement>? Function()? achievements,
    bool? statsError,
    bool? saving,
    bool? saved,
    String? Function()? error,
    ReminderTime? reminder,
    bool? reminderDenied,
  }) => ProfileState(
    summary: summary ?? this.summary,
    week: week ?? this.week,
    achievements: achievements != null ? achievements() : this.achievements,
    statsError: statsError ?? this.statsError,
    saving: saving ?? this.saving,
    saved: saved ?? this.saved,
    error: error != null ? error() : this.error,
    reminder: reminder ?? this.reminder,
    reminderDenied: reminderDenied ?? this.reminderDenied,
  );

  @override
  List<Object?> get props => [
    summary,
    week,
    achievements,
    statsError,
    saving,
    saved,
    error,
    reminder,
    reminderDenied,
  ];
}

/// Perfil: números, semana, conquistas e preferências (nível, meta, lembrete).
class ProfileCubit extends Cubit<ProfileState> {
  ProfileCubit({required this._stats, required this._preferences, required this._reminders})
    : super(const ProfileState());

  final StatsRepository _stats;
  final PreferencesRepository _preferences;
  final Reminders _reminders;

  Future<void> load() async {
    final achievements = _stats.achievements().then<List<Achievement>?>(
      (v) => v,
      onError: (_) => null,
    );
    final reminder = _reminders.current();
    try {
      final results = await Future.wait<Object>([_stats.summary(), _stats.daily()]);
      if (isClosed) return;
      emit(
        state.copyWith(
          summary: results[0] as StatsSummary,
          week: results[1] as List<DailyStat>,
          achievements: () => null,
          statsError: false,
        ),
      );
      final list = await achievements;
      final time = await reminder;
      if (!isClosed) emit(state.copyWith(achievements: () => list, reminder: time));
    } on RequestFailure {
      final time = await reminder;
      if (!isClosed) emit(state.copyWith(statsError: state.summary == null, reminder: time));
    }
  }

  /// Troca nível ou meta; true quando salvou (a tela recarrega o usuário).
  Future<bool> setLevel(EnglishLevel level) => _save(() => _preferences.setLevel(level));

  Future<bool> setGoal(int target) => _save(() => _preferences.setGoal(target));

  Future<bool> _save(Future<void> Function() change) async {
    emit(state.copyWith(saving: true, saved: false, error: () => null));
    try {
      await change();
      emit(state.copyWith(saving: false, saved: true));
      return true;
    } on RequestFailure catch (failure) {
      emit(state.copyWith(saving: false, error: () => failure.message));
      return false;
    }
  }

  Future<void> setReminder(ReminderTime time) async {
    final granted = await _reminders.set(time);
    emit(
      state.copyWith(
        reminder: granted ? time : ReminderTime.off,
        reminderDenied: !granted,
        saved: granted,
      ),
    );
  }

  void savedShown() => emit(state.copyWith(saved: false));
}
