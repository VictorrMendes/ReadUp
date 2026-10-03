import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../../../../core/core.dart';
import '../../domain/text/chunker.dart';

/// O que foi tocado: [word] null = frase inteira (segurar).
typedef ReaderSelection = ({
  int paragraph,
  int chunk,
  int sentenceIndex,
  String? word,
  String sentence,
});

/// Um parágrafo continua texto corrido (selecionável pelo leitor de tela como um bloco); tocar
/// numa palavra abre o painel dela, segurar escolhe a frase. Um detector só por parágrafo (acha o
/// bloco pela posição do toque no texto), em vez de um por palavra: leve mesmo em capítulos longos.
/// Nada de animação por palavra (leitor calmo, plan.txt §3).
class ParagraphView extends StatefulWidget {
  const ParagraphView({
    super.key,
    required this.text,
    required this.index,
    required this.style,
    required this.markColor,
    required this.savedColor,
    required this.savedWords,
    required this.selectedChunk,
    required this.selectedSentence,
    required this.onSelect,
  });

  final String text;
  final int index;
  final TextStyle style;

  /// fundo da palavra/frase tocada
  final Color markColor;

  /// sublinhado das palavras já salvas
  final Color savedColor;
  final Set<String> savedWords;
  final int? selectedChunk;
  final int? selectedSentence;
  final ValueChanged<ReaderSelection> onSelect;

  @override
  State<ParagraphView> createState() => _ParagraphViewState();
}

class _ParagraphViewState extends State<ParagraphView> {
  final _textKey = GlobalKey();
  late List<Chunk> _chunks = chunkParagraph(widget.text);

  @override
  void didUpdateWidget(ParagraphView old) {
    super.didUpdateWidget(old);
    if (old.text != widget.text) _chunks = chunkParagraph(widget.text);
  }

  /// Bloco sob o ponto tocado (posição no texto → bloco, pelos comprimentos acumulados).
  int? _chunkAt(Offset globalPosition) {
    final paragraph = _textKey.currentContext?.findRenderObject();
    if (paragraph is! RenderParagraph) return null;
    final offset = paragraph.getPositionForOffset(paragraph.globalToLocal(globalPosition)).offset;
    var end = 0;
    for (final (i, chunk) in _chunks.indexed) {
      end += chunk.text.length;
      if (offset < end) return i;
    }
    return _chunks.isEmpty ? null : _chunks.length - 1;
  }

  void _select(int i, {required bool sentence}) {
    final chunk = _chunks[i];
    widget.onSelect((
      paragraph: widget.index,
      chunk: i,
      sentenceIndex: chunk.sentence,
      word: sentence ? null : chunk.word,
      sentence: sentenceText(_chunks, chunk.sentence),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final mark = TextStyle(backgroundColor: widget.markColor);
    final saved = TextStyle(
      decoration: TextDecoration.underline,
      decorationStyle: TextDecorationStyle.dotted,
      decorationColor: widget.savedColor,
      decorationThickness: 2,
    );
    final spans = <InlineSpan>[];
    for (final (i, chunk) in _chunks.indexed) {
      final sentenceMarked = chunk.sentence == widget.selectedSentence;
      final wordMarked = i == widget.selectedChunk && !sentenceMarked;
      final isSaved = chunk.word != null && widget.savedWords.contains(chunk.word);
      if (!wordMarked && !isSaved) {
        spans.add(TextSpan(text: chunk.text, style: sentenceMarked ? mark : null));
        continue;
      }
      // destaque e sublinhado só na palavra, sem a pontuação em volta
      spans.addAll([
        TextSpan(text: chunk.text.substring(0, chunk.start), style: sentenceMarked ? mark : null),
        TextSpan(
          text: chunk.text.substring(chunk.start, chunk.end),
          style: (wordMarked || sentenceMarked ? mark : const TextStyle()).merge(
            isSaved ? saved : null,
          ),
        ),
        TextSpan(text: chunk.text.substring(chunk.end), style: sentenceMarked ? mark : null),
      ]);
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapUp: (details) {
          final i = _chunkAt(details.globalPosition);
          if (i != null && _chunks[i].word != null) _select(i, sentence: false);
        },
        onLongPressStart: (details) {
          final i = _chunkAt(details.globalPosition);
          if (i == null) return;
          // frase inteira escolhida: um toque firme confirma o gesto
          Haptics.hold();
          _select(i, sentence: true);
        },
        // o texto é o mesmo com ou sem destaque: leitor de tela lê o parágrafo inteiro. RichText
        // direto (não Text): o toque procura o RenderParagraph pela chave
        child: Semantics(
          label: widget.text,
          excludeSemantics: true,
          child: RichText(
            key: _textKey,
            textScaler: MediaQuery.textScalerOf(context),
            text: TextSpan(
              style: DefaultTextStyle.of(context).style.merge(widget.style),
              children: spans,
            ),
          ),
        ),
      ),
    );
  }
}
