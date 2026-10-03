import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/shared/domain/constants/levels.dart';
import 'package:readup/shared/domain/repositories/articles_repository.dart';

import '../../../fakes/fixtures.dart';
import '../../../fakes/mocks.dart';

void main() {
  late MockHttpHelper http;
  late ArticlesRepository repository;

  setUp(() {
    http = MockHttpHelper();
    repository = ArticlesRepository(httpHelper: http);
  });

  test('lista por nível (sem categoria, o parâmetro não vai)', () async {
    when(() => http.get(any())).thenAnswer((_) async => [articleJson()]);

    final list = await repository.list(level: EnglishLevel.b1);

    expect(list.single.id, 10);
    verify(() => http.get('/articles?limit=50&level=B1')).called(1);
  });

  test('continuar lendo: o mais recente em andamento, ou null', () async {
    when(() => http.get('/articles?in_progress=true&limit=1')).thenAnswer((_) async => []);
    expect(await repository.continueReading(), isNull);

    when(() => http.get('/articles?in_progress=true&limit=1'))
        .thenAnswer((_) async => [articleJson(progress: 40)]);
    expect((await repository.continueReading())?.progress, 40);
  });
}
