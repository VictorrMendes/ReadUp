import '../../../core/core.dart';
import '../../../shared/domain/constants/levels.dart';
import '../../../shared/domain/models/stats.dart';

/// Frase do topo do Início.
String? heroMessage(GoalStatus goal) {
  if (goal.target == null) return null;
  if (goal.completed) return 'Meta de hoje cumprida. Bom trabalho!';
  if (goal.wordsToday == 0) return 'Que tal um texto curto agora?';
  return 'Faltam ${goal.remaining.formatted} palavras para fechar a meta.';
}

/// Botão do cartão da meta.
String goalActionLabel({required bool completed, required bool hasInProgress}) {
  if (completed) return 'Ler mais um';
  return hasInProgress ? 'Continuar leitura' : 'Ler um texto';
}

int minutesLeft(int remainingWords) => (remainingWords / wordsPerMinute).ceil();

/// Legenda da ofensiva: positiva, nunca de culpa (plan.txt §2 Ética).
String streakCaption({
  required int current,
  required int longest,
  required bool activeToday,
  bool goalMetToday = false,
}) {
  if (current == 0 && longest > 0) {
    return 'Acontece. Recomece hoje · recorde de ${longest.asDays} salvo';
  }
  if (goalMetToday) return 'de ofensiva · meta de hoje batida';
  return activeToday ? 'de ofensiva · mantida hoje' : 'de ofensiva · um texto curto hoje mantém';
}

String freezesLabel(int freezes) {
  if (freezes == 0) return 'Sem escudos: leia hoje para manter';
  return '$freezes ${freezes == 1 ? 'escudo' : 'escudos'} · cobrem dias sem leitura';
}
