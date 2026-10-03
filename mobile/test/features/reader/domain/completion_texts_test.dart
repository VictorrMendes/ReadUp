import 'package:flutter_test/flutter_test.dart';
import 'package:readup/features/reader/domain/completion_texts.dart';

void main() {
  test('título: marco só quando a ofensiva subiu nesta leitura', () {
    expect(completionTitle(streak: 66, streakUp: true, pick: 0), '66 dias seguidos!');
    expect(completionTitle(streak: 7, streakUp: false, pick: 0), 'Mais um texto lido!');
    expect(completionTitle(streak: 5, streakUp: true, pick: 0.5), 'Mandou bem!');
    expect(completionTitle(streak: 5, streakUp: true, pick: 0.99), 'Leitura concluída');
  });

  test('frases dos marcos e do recorde', () {
    expect(milestoneNote(66), '66 dias: o tempo médio para um hábito se firmar.');
    expect(milestoneNote(13), isNull);
    expect(streakNote(13, 21), '+1 hoje · faltam 8 dias para o recorde');
    expect(streakNote(21, 21), 'Novo recorde!');
    expect(streakNote(3, null), '+1 hoje');
  });
}
