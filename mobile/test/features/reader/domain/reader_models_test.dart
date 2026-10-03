import 'package:flutter_test/flutter_test.dart';
import 'package:readup/features/reader/domain/end_state.dart';
import 'package:readup/features/reader/domain/models/article_detail.dart';
import 'package:readup/features/reader/domain/models/reader_settings.dart';

import '../../../fakes/fixtures.dart';

void main() {
  test('segundos que faltam para o servidor creditar o texto (10 palavras/s, mínimo 1)', () {
    expect(secondsToComplete(640, 100), 54);
    expect(secondsToComplete(640, 640), 1);
  });

  test('parágrafos separados por linha em branco', () {
    final detail = ArticleDetail.fromJson({
      ...articleJson(),
      'content': 'First.\n\nSecond line\nstill second.\n \n\nThird.',
      'next_article_id': null,
      'source_url': null,
      'attribution': null,
    });
    expect(detail.paragraphs, ['First.', 'Second line\nstill second.', 'Third.']);
  });

  test('preferências do leitor: ida e volta, e lixo volta ao padrão', () {
    const settings = ReaderSettings(sizeIndex: 3, font: ReaderFont.sans, theme: ReaderTheme.sepia);
    expect(ReaderSettings.fromJson(settings.toJson()), settings);
    expect(
      ReaderSettings.fromJson('{"sizeIndex": 99, "theme": "neon"}'),
      const ReaderSettings(sizeIndex: 4),
    );
    expect(ReaderSettings.fromJson('not json'), const ReaderSettings());
    expect(ReaderSettings.fromJson(null).fontSize, 18);
    expect(settings.title.fontSize, 32); // título acompanha o tamanho
  });
}
