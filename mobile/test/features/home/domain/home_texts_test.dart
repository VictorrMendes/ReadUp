import 'package:flutter_test/flutter_test.dart';
import 'package:readup/features/home/domain/home_texts.dart';
import 'package:readup/shared/domain/models/stats.dart';

import '../../../fakes/fixtures.dart';

void main() {
  test('frase do topo segue a meta', () {
    expect(heroMessage(goalOpen), 'Faltam 180 palavras para fechar a meta.');
    expect(heroMessage(goalDone), 'Meta de hoje cumprida. Bom trabalho!');
    expect(
      heroMessage(const GoalStatus(target: 500, wordsToday: 0, remaining: 500, completed: false)),
      'Que tal um texto curto agora?',
    );
    expect(
      heroMessage(const GoalStatus(target: null, wordsToday: 0, remaining: 0, completed: false)),
      isNull,
    );
  });

  test('botão da meta e minutos restantes', () {
    expect(goalActionLabel(completed: true, hasInProgress: true), 'Ler mais um');
    expect(goalActionLabel(completed: false, hasInProgress: true), 'Continuar leitura');
    expect(goalActionLabel(completed: false, hasInProgress: false), 'Ler um texto');
    expect(minutesLeft(180), 1);
    expect(minutesLeft(1000), 5);
  });

  test('legenda da ofensiva sem culpa (mesmos textos do web)', () {
    expect(
      streakCaption(current: 0, longest: 21, activeToday: false),
      'Acontece. Recomece hoje · recorde de 21 dias salvo',
    );
    expect(
      streakCaption(current: 3, longest: 7, activeToday: true, goalMetToday: true),
      'de ofensiva · meta de hoje batida',
    );
    expect(streakCaption(current: 3, longest: 7, activeToday: true), 'de ofensiva · mantida hoje');
    expect(
      streakCaption(current: 3, longest: 7, activeToday: false),
      'de ofensiva · um texto curto hoje mantém',
    );
    expect(freezesLabel(1), '1 escudo · cobrem dias sem leitura');
    expect(freezesLabel(0), 'Sem escudos: leia hoje para manter');
  });
}
