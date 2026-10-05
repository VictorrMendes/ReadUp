import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/services/floating_translator.dart';

class FloatingTranslatorState extends Equatable {
  const FloatingTranslatorState({
    this.on = false,
    this.busy = false,
    this.askPermission = false,
    this.failed = false,
  });

  final bool on;
  final bool busy;

  /// falta "aparecer sobre outros apps": a tela explica e oferece abrir as configurações
  final bool askPermission;

  /// o sistema não deixou ligar (a tela avisa uma vez)
  final bool failed;

  FloatingTranslatorState copyWith({bool? on, bool? busy, bool? askPermission, bool? failed}) =>
      FloatingTranslatorState(
        on: on ?? this.on,
        busy: busy ?? this.busy,
        askPermission: askPermission ?? this.askPermission,
        failed: failed ?? this.failed,
      );

  @override
  List<Object?> get props => [on, busy, askPermission, failed];
}

/// Interruptor "Tradução flutuante" do Início. O estado vem do serviço nativo (a bolha pode ter sido
/// desligada pela notificação ou pelo sistema), não de uma preferência guardada.
class FloatingTranslatorCubit extends Cubit<FloatingTranslatorState> {
  FloatingTranslatorCubit({required this._translator}) : super(const FloatingTranslatorState());

  final FloatingTranslator _translator;

  /// voltou das configurações do sistema: liga se a permissão chegou
  bool _waitingPermission = false;

  Future<void> load() async {
    final on = await _translator.isRunning();
    if (!isClosed) emit(state.copyWith(on: on));
  }

  Future<void> toggle(bool on) async {
    if (state.busy) return;
    if (!on) {
      emit(state.copyWith(busy: true));
      await _translator.stop();
      emit(state.copyWith(on: false, busy: false));
      return;
    }
    if (!await _translator.hasPermission()) {
      emit(state.copyWith(askPermission: true));
      return;
    }
    await _start();
  }

  /// resposta ao aviso da permissão
  Future<void> permissionAnswered({required bool openSettings}) async {
    emit(state.copyWith(askPermission: false));
    if (!openSettings) return;
    _waitingPermission = true;
    await _translator.openPermissionSettings();
  }

  /// o app voltou ao primeiro plano
  Future<void> resumed() async {
    if (_waitingPermission) {
      _waitingPermission = false;
      if (await _translator.hasPermission()) return _start();
    }
    await load();
  }

  void failureShown() => emit(state.copyWith(failed: false));

  Future<void> _start() async {
    emit(state.copyWith(busy: true));
    final started = await _translator.start();
    if (!isClosed) emit(state.copyWith(on: started, busy: false, failed: !started));
  }
}
