import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../shared/domain/constants/levels.dart';
import '../../../../shared/domain/models/achievement.dart';
import '../../../../shared/domain/models/article_summary.dart';
import '../../../../shared/domain/models/stats.dart';
import '../../../../shared/domain/repositories/articles_repository.dart';
import '../../../../shared/domain/repositories/stats_repository.dart';

part 'home_event.dart';
part 'home_state.dart';

/// Início: meta e "continuar lendo" são obrigatórios; resumo, semana e conquistas são opcionais
/// (falha só deles esconde a parte que depende deles).
class HomeBloc extends Bloc<HomeEvent, HomeState> {
  HomeBloc({required this._stats, required this._articles}) : super(const HomeLoading()) {
    on<HomeLoadRequested>(_onLoadRequested);
  }

  final StatsRepository _stats;
  final ArticlesRepository _articles;

  Future<void> _onLoadRequested(HomeLoadRequested event, Emitter<HomeState> emit) async {
    // tentar de novo depois de um erro volta ao esqueleto; recarregar com dados na tela, não
    if (state is HomeFailure) emit(const HomeLoading());
    final summary = _optional(_stats.summary());
    final week = _optional(_stats.daily());
    final achievements = _optional(_stats.achievements());
    try {
      final required = await Future.wait<Object?>([_stats.goal(), _articles.continueReading()]);
      final goal = required[0]! as GoalStatus;
      final continueReading = required[1] as ArticleSummary?;
      // sem texto em andamento: sugere o próximo do nível da pessoa
      final suggestion = continueReading != null
          ? null
          : pickNextText(await _optional(_articles.list(level: event.level)) ?? const []);
      emit(
        HomeLoaded(
          HomeData(
            goal: goal,
            continueReading: continueReading,
            suggestion: suggestion,
            summary: await summary,
            week: await week,
            achievements: await achievements,
          ),
        ),
      );
    } on RequestFailure catch (failure) {
      // falhou ao recarregar: os dados que já estavam na tela continuam
      if (state is! HomeLoaded) emit(HomeFailure(failure.message));
    }
  }

  static Future<T?> _optional<T>(Future<T> future) =>
      future.then<T?>((v) => v, onError: (_) => null);
}
