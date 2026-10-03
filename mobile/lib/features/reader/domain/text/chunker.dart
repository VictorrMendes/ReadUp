/// Bloco tocável do leitor: uma palavra com a pontuação e o espaço em volta dela. [sentence] diz a
/// qual frase do parágrafo pertence; [start]/[end] marcam a palavra dentro de [text] (o destaque
/// pega só ela, sem a pontuação). Juntar os `text` de um parágrafo devolve o original.
class Chunk {
  Chunk({
    required this.text,
    required this.word,
    required this.sentence,
    required this.start,
    required this.end,
  });

  String text;

  /// palavra tocável, minúscula (null: só pontuação/espaço)
  final String? word;
  final int sentence;
  final int start;
  final int end;
}

// letras (com acento), com apóstrofo ou hífen só no meio: "don't" e "well-known" são uma palavra
final _word = RegExp(r"[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’-][A-Za-zÀ-ÖØ-öø-ÿ]+)*");

// abreviações seguidas de ponto que não terminam frase ("Mr. Dursley", "Dr. Who", "e.g.")
const _abbreviations = {
  'mr',
  'mrs',
  'ms',
  'dr',
  'st',
  'jr',
  'sr',
  'prof',
  'vs',
  'etc',
  'e.g',
  'i.e',
  'mt',
};

/// limite do backend para contexto e frase traduzida
const maxContextLength = 300;

/// O trecho (espaço/pontuação) depois da palavra [previous] fecha a frase? "3.5" e "Mr." não fecham.
bool _endsSentence(String between, String? previous) {
  if (between.contains(RegExp(r'[!?]'))) return true;
  // ponto seguido de dígito ("3.5") não termina frase
  final dot = RegExp(r'\.(?!\d)').firstMatch(between);
  if (dot == null) return false;
  // a abreviação só conta com o ponto logo depois dela ("Mr. ", não "Mr, ... .")
  if (dot.start == 0 && previous != null) {
    if (_abbreviations.contains(previous)) return false;
    // iniciais: "J. K. Rowling", "U.S."
    if (previous.length == 1) return false;
  }
  return true;
}

/// Divide o parágrafo em blocos tocáveis: o que vem antes da 1ª palavra entra nela e o que vem
/// depois de cada palavra (espaço, vírgula, ponto) fica com ela.
List<Chunk> chunkParagraph(String paragraph) {
  final chunks = <Chunk>[];
  var sentence = 0;
  var pending = ''; // pontuação antes da primeira palavra (ex.: aspas de abertura)
  var last = 0;

  void addGap(String gap) {
    if (gap.isEmpty) return;
    if (chunks.isEmpty) {
      pending += gap;
      return;
    }
    chunks.last.text += gap;
    if (_endsSentence(gap, chunks.last.word)) sentence += 1;
  }

  for (final match in _word.allMatches(paragraph)) {
    addGap(paragraph.substring(last, match.start));
    final word = match[0]!;
    final start = pending.length;
    chunks.add(
      Chunk(
        text: pending + word,
        word: word.toLowerCase().replaceAll('’', "'"),
        sentence: sentence,
        start: start,
        end: start + word.length,
      ),
    );
    pending = '';
    last = match.end;
  }
  addGap(paragraph.substring(last));
  if (pending.isNotEmpty) {
    chunks.add(Chunk(text: pending, word: null, sentence: sentence, start: 0, end: 0));
  }
  return chunks;
}

/// Texto da frase [sentence] do parágrafo (traduzir, ouvir, contexto), no limite do backend.
String sentenceText(List<Chunk> chunks, int sentence) {
  final text = chunks.where((c) => c.sentence == sentence).map((c) => c.text).join().trim();
  return text.length > maxContextLength ? text.substring(0, maxContextLength) : text;
}
