import 'package:flutter/services.dart';

/// Háptica pouca e sincronizada com o visual (plan.txt §3). Nunca é o único sinal: aparelho sem
/// motor ou em economia de bateria ignora. Erro não vibra (sem punição).
abstract final class Haptics {
  /// troca de aba, chip, opção
  static Future<void> select() => HapticFeedback.selectionClick();

  /// ação confirmada (salvar palavra)
  static Future<void> tap() => HapticFeedback.lightImpact();

  /// segurar para traduzir a frase
  static Future<void> hold() => HapticFeedback.mediumImpact();

  /// vitória: meta batida, acerto na revisão (junto da animação)
  static Future<void> success() => HapticFeedback.heavyImpact();
}
