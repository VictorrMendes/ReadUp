part of 'home_bloc.dart';

class HomeData extends Equatable {
  const HomeData({
    required this.goal,
    required this.continueReading,
    required this.suggestion,
    this.summary,
    this.week,
    this.achievements,
  });

  final GoalStatus goal;
  final ArticleSummary? continueReading;
  final ArticleSummary? suggestion;
  final StatsSummary? summary;
  final List<DailyStat>? week;
  final List<Achievement>? achievements;

  /// o texto do botão principal e do cartão de leitura
  ArticleSummary? get readTarget => continueReading ?? suggestion;

  Achievement? get nextAchievementToUnlock =>
      achievements == null ? null : nextAchievement(achievements!);

  @override
  List<Object?> get props => [goal, continueReading, suggestion, summary, week, achievements];
}

sealed class HomeState extends Equatable {
  const HomeState();

  @override
  List<Object?> get props => [];
}

final class HomeLoading extends HomeState {
  const HomeLoading();
}

final class HomeLoaded extends HomeState {
  const HomeLoaded(this.data);

  final HomeData data;

  @override
  List<Object?> get props => [data];
}

final class HomeFailure extends HomeState {
  const HomeFailure(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}
