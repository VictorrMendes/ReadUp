import 'package:flutter_test/flutter_test.dart';
import 'package:readup/features/review/domain/review_session.dart';

import '../../../fakes/fixtures.dart';

void main() {
  test('"ainda aprendendo" repete no fim como treino; contagem só da primeira passada', () {
    var session = ReviewSession.start(const [cardHouse, cardTree]);
    session = session.advance(known: false); // house: ainda aprendendo
    session = session.advance(known: true, xp: 2); // tree: já sei
    expect(session.current?.card, cardHouse);
    expect(session.current?.practice, isTrue);
    expect(session.firstPassTotal, 2);

    session = session.advance(known: false); // treino de novo: não repete outra vez
    expect(session.current, isNull);
    expect((session.known, session.learning, session.xp), (1, 1, 2));
  });

  test('fila vazia: sessão vazia', () {
    expect(ReviewSession.start(const []).empty, isTrue);
  });
}
