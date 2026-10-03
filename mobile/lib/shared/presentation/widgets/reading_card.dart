import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/readup_colors.dart';
import '../../../design_system/spaces.dart';
import '../../domain/models/article_summary.dart';
import '../../domain/models/book_title.dart';
import 'level_badge.dart';
import 'pressable_scale.dart';
import 'progress_bar.dart';

/// Cartão de um texto (feed, "continuar lendo", capítulos): nível, categoria/livro, título em
/// serifa, tempo e progresso. Um rótulo só para o leitor de tela.
class ReadingCard extends StatelessWidget {
  const ReadingCard({super.key, required this.article, required this.onTap});

  final ArticleSummary article;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    // capítulo: o nome do livro diz mais que "Livro"
    final kind = article.bookTitle != null ? cleanBookTitle(article.bookTitle!) : article.category;
    final source = article.category == ArticleSummary.newsCategory ? article.source : null;
    final minutes =
        '${article.estimatedMinutes} ${article.estimatedMinutes == 1 ? 'minuto' : 'minutos'}';
    final label = [
      article.title,
      if (article.difficulty case final level?) 'nível ${level.code}',
      kind,
      ?source,
      minutes,
      if (article.completed) 'concluído' else if (article.inProgress) '${article.progress}% lido',
    ].join(', ');

    return PressableScale(
      onTap: onTap,
      scaleTo: 0.98,
      borderRadius: BorderRadius.circular(Radii.card),
      semanticLabel: label,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(Spaces.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (article.difficulty case final level?) ...[
                    LevelBadge(label: level.code, highlighted: true),
                    const SizedBox(width: Spaces.sm),
                  ],
                  // a etiqueta encolhe se precisar; o check fica sempre no canto direito
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: LevelBadge(label: kind),
                    ),
                  ),
                  if (article.completed)
                    const Icon(Icons.check_circle, color: ReadUpColors.success600, size: 22),
                ],
              ),
              const SizedBox(height: Spaces.sm),
              Text(
                article.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: context.readupText.cardTitle,
              ),
              const SizedBox(height: Spaces.sm),
              Row(
                children: [
                  const Icon(Icons.schedule, size: 14, color: ReadUpColors.textSecondary),
                  const SizedBox(width: Spaces.xs),
                  Flexible(
                    child: Text(
                      '${article.estimatedMinutes} min · ${article.wordCount.formatted} palavras',
                      style: text.bodyMedium?.copyWith(color: ReadUpColors.textSecondary),
                    ),
                  ),
                ],
              ),
              if (source != null) ...[
                const SizedBox(height: Spaces.xs),
                Text(source, style: text.bodySmall?.copyWith(color: ReadUpColors.textSecondary)),
              ],
              if (article.inProgress) ...[
                const SizedBox(height: Spaces.sm),
                Row(
                  children: [
                    Expanded(child: ProgressBar(value: article.progress / 100)),
                    const SizedBox(width: Spaces.sm),
                    Text(
                      '${article.progress}% lido',
                      style: text.bodySmall?.copyWith(color: ReadUpColors.textSecondary),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
