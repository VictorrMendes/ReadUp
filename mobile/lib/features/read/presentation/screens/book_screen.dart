import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/routes/routes_path.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/book_title.dart';
import '../../../../shared/presentation/widgets/error_retry.dart';
import '../../../../shared/presentation/widgets/reading_card.dart';
import '../../domain/models/book.dart';
import '../../domain/repositories/books_repository.dart';
import '../cubits/book_cubit.dart';

/// Livro importado: capítulos com progresso, "continuar leitura" e remover.
class BookScreen extends StatelessWidget {
  const BookScreen({super.key, required this.bookId});

  final int bookId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) =>
          BookCubit(books: context.read<BooksRepository>(), bookId: bookId)..load(),
      child: const _BookBody(),
    );
  }
}

class _BookBody extends StatelessWidget {
  const _BookBody();

  Future<void> _openChapter(BuildContext context, int id) async {
    await Navigator.of(context).pushNamed(RoutesPath.article, arguments: id);
    if (context.mounted) await context.read<BookCubit>().load();
  }

  Future<void> _confirmDelete(BuildContext context, Book book) async {
    final cubit = context.read<BookCubit>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remover livro'),
        content: Text('Remover "${cleanBookTitle(book.title)}" e o progresso de leitura dele?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: ReadUpColors.errorText),
            child: const Text('Remover'),
          ),
        ],
      ),
    );
    if (confirmed ?? false) await cubit.delete();
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<BookCubit>();
    return BlocConsumer<BookCubit, BookState>(
      listener: (context, state) {
        if (state.deleted) Navigator.of(context).pop();
        if (state.deleteError case final message?) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
        }
      },
      builder: (context, state) {
        final detail = state.detail;
        return Scaffold(
          appBar: AppBar(
            actions: [
              if (detail != null)
                IconButton(
                  tooltip: 'Remover ${cleanBookTitle(detail.book.title)}',
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => _confirmDelete(context, detail.book),
                ),
            ],
          ),
          body: switch (state) {
            BookState(notFound: true) => const Center(child: Text('Livro não encontrado')),
            BookState(error: final error?) => ErrorRetry(message: error, onRetry: cubit.retry),
            _ when detail == null => const Center(child: CircularProgressIndicator()),
            _ => _ChapterList(detail: detail, onOpen: (id) => _openChapter(context, id)),
          },
        );
      },
    );
  }
}

class _ChapterList extends StatelessWidget {
  const _ChapterList({required this.detail, required this.onOpen});

  final BookDetail detail;
  final ValueChanged<int> onOpen;

  @override
  Widget build(BuildContext context) {
    final book = detail.book;
    final next = detail.continueChapter;
    return ListView(
      padding: const EdgeInsets.fromLTRB(Spaces.lg, Spaces.lg, Spaces.lg, Spaces.xl),
      children: [
        Semantics(
          header: true,
          child: Text(cleanBookTitle(book.title), style: context.readupText.readingTitle),
        ),
        const SizedBox(height: Spaces.xs),
        Text(
          '${book.chapterCount.formatted} ${book.chapterCount == 1 ? 'capítulo' : 'capítulos'} · '
          '${book.wordCount.formatted} palavras',
          style: context.textTheme.bodyMedium?.copyWith(color: ReadUpColors.textSecondary),
        ),
        if (next != null) ...[
          const SizedBox(height: Spaces.lg),
          FilledButton(
            onPressed: () => onOpen(next.id),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
            child: const Text('Continuar leitura'),
          ),
        ],
        for (final chapter in detail.chapters) ...[
          const SizedBox(height: Spaces.md),
          ReadingCard(article: chapter.toSummary(), onTap: () => onOpen(chapter.id)),
        ],
      ],
    );
  }
}
