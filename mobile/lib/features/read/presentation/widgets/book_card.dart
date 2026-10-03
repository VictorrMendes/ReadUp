import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/book_title.dart';
import '../../../../shared/presentation/widgets/pressable_scale.dart';
import '../../../../shared/presentation/widgets/progress_bar.dart';
import '../../domain/models/book.dart';

String _plural(int count, String one, String many) =>
    '${count.formatted} ${count == 1 ? one : many}';

/// PDF importado: título, quanto já foi lido e o tamanho. O cartão inteiro abre o livro.
class BookCard extends StatelessWidget {
  const BookCard({super.key, required this.book, required this.onTap});

  final Book book;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final title = cleanBookTitle(book.title);
    final read = '${book.wordsRead.formatted} de ${book.wordCount.formatted} palavras';
    final size =
        '${_plural(book.chapterCount, 'capítulo', 'capítulos')} · ${_plural(book.pageCount, 'página', 'páginas')}';
    final secondary = text.bodyMedium?.copyWith(color: ReadUpColors.textSecondary);
    return PressableScale(
      onTap: onTap,
      scaleTo: 0.98,
      borderRadius: BorderRadius.circular(Radii.card),
      semanticLabel: [
        title,
        read,
        if (book.progress > 0) '${book.progress}% lido',
        size,
      ].join(', '),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(Spaces.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: context.readupText.cardTitle,
              ),
              const SizedBox(height: Spaces.sm),
              Text(read, style: secondary),
              if (book.progress > 0) ...[
                const SizedBox(height: Spaces.sm),
                Row(
                  children: [
                    Expanded(child: ProgressBar(value: book.progress / 100)),
                    const SizedBox(width: Spaces.sm),
                    Text(
                      '${book.progress}% lido',
                      style: text.bodySmall?.copyWith(color: ReadUpColors.textSecondary),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: Spaces.sm),
              Text(size, style: text.bodySmall?.copyWith(color: ReadUpColors.textSecondary)),
            ],
          ),
        ),
      ),
    );
  }
}
