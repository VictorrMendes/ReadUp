import '../../../core/core.dart';
import '../constants/levels.dart';

/// Nível e meta diária (onboarding e Perfil).
class PreferencesRepository {
  PreferencesRepository({required this._httpHelper});

  final HttpHelper _httpHelper;

  Future<void> setLevel(EnglishLevel level) => repositoryExceptionHandlerScope(
    () => _httpHelper.patch('/users/me', body: {'english_level': level.code}),
  );

  Future<void> setGoal(int target) =>
      repositoryExceptionHandlerScope(() => _httpHelper.put('/goals', body: {'target': target}));
}
