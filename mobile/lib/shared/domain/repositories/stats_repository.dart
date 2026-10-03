import '../../../core/core.dart';
import '../models/achievement.dart';
import '../models/stats.dart';

/// Números do usuário: resumo, últimos dias, conquistas e meta de hoje.
class StatsRepository {
  StatsRepository({required this._httpHelper});

  final HttpHelper _httpHelper;

  Future<StatsSummary> summary() => repositoryExceptionHandlerScope(
    () async =>
        StatsSummary.fromJson((await _httpHelper.get('/stats/summary'))! as Map<String, Object?>),
  );

  /// Últimos [days] dias, do mais antigo para hoje (dias sem leitura vêm zerados).
  Future<List<DailyStat>> daily({int days = 7}) => repositoryExceptionHandlerScope(() async {
    final response = await _httpHelper.get('/stats/daily?days=$days');
    return [
      for (final item in response! as List<Object?>)
        DailyStat.fromJson(item! as Map<String, Object?>),
    ];
  });

  Future<List<Achievement>> achievements() => repositoryExceptionHandlerScope(() async {
    final response = await _httpHelper.get('/achievements');
    return [
      for (final item in response! as List<Object?>)
        Achievement.fromJson(item! as Map<String, Object?>),
    ];
  });

  Future<GoalStatus> goal() => repositoryExceptionHandlerScope(
    () async => GoalStatus.fromJson((await _httpHelper.get('/goals'))! as Map<String, Object?>),
  );
}
