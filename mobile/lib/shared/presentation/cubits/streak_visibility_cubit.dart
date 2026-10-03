import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// "Esconder a ofensiva" (Perfil): preferência deste aparelho (autonomia, plan.txt §4.5).
/// Estado: true = escondida; null enquanto lê do aparelho.
class StreakVisibilityCubit extends Cubit<bool?> {
  StreakVisibilityCubit({SharedPreferencesAsync? preferences})
    : _preferences = preferences ?? SharedPreferencesAsync(),
      super(null);

  static const _key = 'readup.hide_streak';
  final SharedPreferencesAsync _preferences;

  Future<void> load() async {
    try {
      emit(await _preferences.getBool(_key) ?? false);
    } catch (_) {
      emit(false); // sem leitura: mostra (o padrão)
    }
  }

  Future<void> setHidden(bool hidden) async {
    emit(hidden);
    try {
      await _preferences.setBool(_key, hidden);
    } catch (_) {
      // não gravou: vale até fechar o app
    }
  }
}
