import 'package:equatable/equatable.dart';

class StatsSummary extends Equatable {
  const StatsSummary({
    required this.xpTotal,
    required this.wordsTotal,
    required this.textsCompletedTotal,
    required this.minutesTotal,
    required this.wordsSavedTotal,
    required this.booksStarted,
    required this.booksCompleted,
    required this.streakCurrent,
    required this.streakLongest,
    required this.streakActiveToday,
    required this.streakFreezes,
  });

  factory StatsSummary.fromJson(Map<String, Object?> json) => StatsSummary(
    xpTotal: json['xp_total']! as int,
    wordsTotal: json['words_total']! as int,
    textsCompletedTotal: json['texts_completed_total']! as int,
    minutesTotal: json['minutes_total']! as int,
    wordsSavedTotal: json['words_saved_total']! as int,
    booksStarted: json['books_started']! as int,
    booksCompleted: json['books_completed']! as int,
    streakCurrent: json['streak_current']! as int,
    streakLongest: json['streak_longest']! as int,
    streakActiveToday: json['streak_active_today']! as bool,
    streakFreezes: json['streak_freezes'] as int? ?? 0,
  );

  final int xpTotal;
  final int wordsTotal;
  final int textsCompletedTotal;
  final int minutesTotal;
  final int wordsSavedTotal;
  final int booksStarted;
  final int booksCompleted;

  /// efetiva: 0 se quebrou
  final int streakCurrent;
  final int streakLongest;

  /// mínimo do dia feito (50 palavras lidas)
  final bool streakActiveToday;

  /// escudos restantes (0 com a ofensiva quebrada)
  final int streakFreezes;

  @override
  List<Object?> get props => [xpTotal, wordsTotal, streakCurrent, streakActiveToday, streakFreezes];
}

/// Um dos últimos dias (do mais antigo para hoje).
class DailyStat extends Equatable {
  const DailyStat({
    required this.day,
    required this.wordsRead,
    required this.xp,
    required this.goalMet,
    required this.streakKept,
  });

  factory DailyStat.fromJson(Map<String, Object?> json) => DailyStat(
    day: json['day']! as String,
    wordsRead: json['words_read']! as int,
    xp: json['xp']! as int,
    goalMet: json['goal_met']! as bool,
    streakKept: json['streak_kept'] as bool? ?? false,
  );

  final String day;
  final int wordsRead;
  final int xp;
  final bool goalMet;

  /// mínimo do dia feito
  final bool streakKept;

  @override
  List<Object?> get props => [day, wordsRead, xp, goalMet, streakKept];
}

class GoalStatus extends Equatable {
  const GoalStatus({
    required this.target,
    required this.wordsToday,
    required this.remaining,
    required this.completed,
  });

  factory GoalStatus.fromJson(Map<String, Object?> json) => GoalStatus(
    target: json['target'] as int?,
    wordsToday: json['words_today']! as int,
    remaining: json['remaining']! as int,
    completed: json['completed']! as bool,
  );

  final int? target;
  final int wordsToday;
  final int remaining;
  final bool completed;

  @override
  List<Object?> get props => [target, wordsToday, remaining, completed];
}
