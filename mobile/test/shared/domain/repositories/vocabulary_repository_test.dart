import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/shared/domain/repositories/vocabulary_repository.dart';

import '../../../fakes/mocks.dart';

void main() {
  late MockHttpHelper http;
  late VocabularyRepository repository;

  setUp(() {
    http = MockHttpHelper();
    repository = VocabularyRepository(httpHelper: http);
  });

  test('tradução da palavra com a busca codificada', () async {
    when(() => http.get(any())).thenAnswer(
      (_) async => {'word': "don't", 'translation': 'não', 'saved': false, 'saved_id': null},
    );
    final lookup = await repository.lookup("don't");
    expect(lookup.translation, 'não');
    verify(() => http.get('/vocabulary/lookup?word=don%27t')).called(1);
  });

  test('salvar manda a frase de contexto e o texto; sem eles, os campos nem vão', () async {
    final saved = {
      'id': 7,
      'word': 'house',
      'translation': 'casa',
      'context': 'The house.',
      'article_id': 3,
      'article_title': 'X',
      'created_at': '2026-10-01T12:00:00Z',
    };
    when(() => http.post('/vocabulary', body: any(named: 'body'))).thenAnswer((_) async => saved);

    await repository.save(word: 'house', articleId: 3, context: 'The house.');
    await repository.save(word: 'house');

    verify(
      () => http.post(
        '/vocabulary',
        body: {'word': 'house', 'article_id': 3, 'context': 'The house.'},
      ),
    ).called(1);
    verify(() => http.post('/vocabulary', body: {'word': 'house'})).called(1);
  });

  test('tradução de frase', () async {
    when(() => http.post('/vocabulary/translate-sentence', body: any(named: 'body')))
        .thenAnswer((_) async => {'text': 'Hi.', 'translation': 'Oi.'});
    expect(await repository.translateSentence(articleId: 3, text: 'Hi.'), 'Oi.');
  });
}
