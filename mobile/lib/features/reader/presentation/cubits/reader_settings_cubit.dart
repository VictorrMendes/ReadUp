import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/models/reader_settings.dart';

/// Aparência do leitor (painel "Aa"), guardada no aparelho.
class ReaderSettingsCubit extends Cubit<ReaderSettings> {
  ReaderSettingsCubit({SharedPreferencesAsync? preferences})
    : _preferences = preferences ?? SharedPreferencesAsync(),
      super(const ReaderSettings());

  static const _key = 'readup.reader_settings';
  final SharedPreferencesAsync _preferences;

  Future<void> load() async {
    try {
      emit(ReaderSettings.fromJson(await _preferences.getString(_key)));
    } catch (_) {
      // sem preferência salva: fica no padrão
    }
  }

  Future<void> update(ReaderSettings settings) async {
    emit(settings);
    try {
      await _preferences.setString(_key, settings.toJson());
    } catch (_) {
      // não gravou: vale até fechar o app
    }
  }
}
