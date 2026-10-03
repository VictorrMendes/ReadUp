import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/readup_colors.dart';

/// A frase onde a palavra apareceu, com a palavra em destaque (1ª ocorrência inteira, sem olhar
/// maiúsculas). Sem a palavra na frase, só a frase.
class ContextSentence extends StatelessWidget {
  const ContextSentence({super.key, required this.sentence, required this.word, this.maxLines});

  final String sentence;
  final String word;
  final int? maxLines;

  @override
  Widget build(BuildContext context) {
    final style = context.textTheme.bodyMedium?.copyWith(color: ReadUpColors.textSecondary);
    final match = RegExp(
      "(?<![A-Za-z'])${RegExp.escape(word)}(?![A-Za-z'])",
      caseSensitive: false,
    ).firstMatch(sentence);
    if (match == null) {
      return Text(sentence, style: style, maxLines: maxLines, overflow: TextOverflow.ellipsis);
    }
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: sentence.substring(0, match.start)),
          TextSpan(
            text: match[0],
            style: const TextStyle(fontWeight: FontWeight.w600, color: ReadUpColors.textPrimary),
          ),
          TextSpan(text: sentence.substring(match.end)),
        ],
      ),
      style: style,
      maxLines: maxLines,
      overflow: TextOverflow.ellipsis,
    );
  }
}
