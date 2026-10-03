import 'package:flutter_test/flutter_test.dart';
import 'package:readup/features/reader/domain/text/chunker.dart';

void main() {
  String rejoin(List<Chunk> chunks) => chunks.map((c) => c.text).join();
  List<int> sentences(List<Chunk> chunks) => [
    for (final c in chunks)
      if (c.word != null) c.sentence,
  ];

  test('juntar os blocos devolve o parágrafo original (aspas e pontuação inclusive)', () {
    const text = '"Hello," said Harry. It\'s a well-known fact!  Right?';
    expect(rejoin(chunkParagraph(text)), text);
  });

  test('palavra tocável em minúsculas, com apóstrofo e hífen no meio', () {
    final words = chunkParagraph('Don’t stop, well-known Friends.').map((c) => c.word).toList();
    expect(words, ["don't", 'stop', 'well-known', 'friends']);
  });

  test('frases: ponto, exclamação e interrogação fecham; Mr., iniciais e 3.5 não', () {
    expect(sentences(chunkParagraph('Mr. Dursley was tall. He worked!')), [0, 0, 0, 0, 1, 1]);
    expect(sentences(chunkParagraph('J. K. Rowling wrote it. Yes.')), [0, 0, 0, 0, 0, 1]);
    expect(sentences(chunkParagraph('It costs 3.5 dollars. Cheap?')), [0, 0, 0, 1]);
  });

  test('destaque marca só a palavra, sem a pontuação em volta', () {
    final chunk = chunkParagraph('"Hello," she said.').first;
    expect(chunk.text, '"Hello," ');
    expect(chunk.text.substring(chunk.start, chunk.end), 'Hello');
  });

  test('frase para traduzir/contexto, no limite de 300 caracteres', () {
    final chunks = chunkParagraph('First one. Second one here.');
    expect(sentenceText(chunks, 1), 'Second one here.');
    final long = chunkParagraph('${'word ' * 100}end.');
    expect(sentenceText(long, 0).length, maxContextLength);
  });
}
