import 'package:equatable/equatable.dart';

/// Conquista desbloqueada num envio de progresso.
class AchievementRef extends Equatable {
  const AchievementRef({required this.id, required this.title, required this.icon});

  factory AchievementRef.fromJson(Map<String, Object?> json) => AchievementRef(
    id: json['id']! as String,
    title: json['title']! as String,
    icon: json['icon']! as String,
  );

  final String id;
  final String title;
  final String icon;

  @override
  List<Object?> get props => [id];
}

/// Resposta de POST /reading/progress.
class ProgressResult extends Equatable {
  const ProgressResult({
    required this.progress,
    required this.wordsRead,
    required this.wordsCredited,
    required this.completed,
    required this.xpGained,
    required this.goalMet,
    required this.streak,
    required this.streakActiveToday,
    this.achievementsUnlocked = const [],
  });

  factory ProgressResult.fromJson(Map<String, Object?> json) => ProgressResult(
    progress: json['progress']! as int,
    wordsRead: json['words_read']! as int,
    wordsCredited: json['words_credited']! as int,
    completed: json['completed']! as bool,
    xpGained: json['xp_gained']! as int,
    goalMet: json['goal_met']! as bool,
    streak: json['streak']! as int,
    streakActiveToday: json['streak_active_today'] as bool? ?? false,
    achievementsUnlocked: [
      for (final item in json['achievements_unlocked']! as List<Object?>)
        AchievementRef.fromJson(item! as Map<String, Object?>),
    ],
  );

  final int progress;
  final int wordsRead;
  final int wordsCredited;
  final bool completed;
  final int xpGained;
  final bool goalMet;
  final int streak;

  /// mínimo do dia feito: a ofensiva contou hoje
  final bool streakActiveToday;

  /// desbloqueadas neste envio
  final List<AchievementRef> achievementsUnlocked;

  @override
  List<Object?> get props => [progress, wordsCredited, completed, xpGained, goalMet, streak];
}

/// Acumulado da sessão de leitura: XP e palavras somados, se a meta/ofensiva virou nela, a ofensiva
/// da última resposta e as conquistas desbloqueadas (sem repetir).
class SessionGains extends Equatable {
  const SessionGains({
    this.xp = 0,
    this.words = 0,
    this.goalMet = false,
    this.streakUp = false,
    this.streak = 0,
    this.achievements = const [],
  });

  final int xp;
  final int words;
  final bool goalMet;

  /// a ofensiva contou hoje durante esta sessão (mínimo do dia)
  final bool streakUp;
  final int streak;
  final List<AchievementRef> achievements;

  @override
  List<Object?> get props => [xp, words, goalMet, streakUp, streak, achievements];
}
