import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/routes/routes_path.dart';
import '../../../../core/services/pdf_picker.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/presentation/widgets/empty_state.dart';
import '../../../../shared/presentation/widgets/enter_animation.dart';
import '../../../../shared/presentation/widgets/error_retry.dart';
import '../../../../shared/presentation/widgets/loading_button.dart';
import '../../../../shared/presentation/widgets/skeleton.dart';
import '../../domain/repositories/books_repository.dart';
import '../cubits/library_cubit.dart';
import 'book_card.dart';

/// "Meus livros": PDFs da pessoa e a importação.
class LibraryView extends StatelessWidget {
  const LibraryView({super.key, this.pickPdf = pickPdfFromDevice});

  final PdfPicker pickPdf;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => LibraryCubit(books: context.read<BooksRepository>())..load(),
      child: _LibraryBody(pickPdf: pickPdf),
    );
  }
}

class _LibraryBody extends StatelessWidget {
  const _LibraryBody({required this.pickPdf});

  final PdfPicker pickPdf;

  Future<void> _openBook(BuildContext context, int id) async {
    await Navigator.of(context).pushNamed(RoutesPath.book, arguments: id);
    // voltou do livro: progresso atualizado (ou o livro foi removido)
    if (context.mounted) await context.read<LibraryCubit>().load();
  }

  Future<void> _import(BuildContext context) async {
    final cubit = context.read<LibraryCubit>();
    if (cubit.state.importing) return;
    final path = await pickPdf();
    if (path != null) await cubit.importPdf(path);
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<LibraryCubit>();
    return BlocConsumer<LibraryCubit, LibraryState>(
      listenWhen: (previous, current) =>
          current.importedBookId != null && previous.importedBookId == null,
      listener: (context, state) {
        cubit.importedBookOpened();
        _openBook(context, state.importedBookId!);
      },
      builder: (context, state) {
        final books = state.books;
        if (state.error case final error?) return ErrorRetry(message: error, onRetry: cubit.retry);
        if (books == null) {
          return Semantics(
            label: 'Carregando livros',
            child: const Padding(
              padding: EdgeInsets.all(Spaces.lg),
              child: Column(
                children: [
                  Skeleton(height: 120),
                  SizedBox(height: Spaces.md),
                  Skeleton(height: 120),
                ],
              ),
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: cubit.load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(Spaces.lg, Spaces.md, Spaces.lg, Spaces.xl),
            children: [
              if (books.isEmpty)
                EmptyState(
                  illustration: 'assets/images/empty-library.png',
                  title: 'Você ainda não possui livros',
                  message: 'Importe seu primeiro PDF para começar.',
                  actionLabel: 'Importar PDF',
                  loading: state.importing,
                  onAction: () => _import(context),
                )
              else
                LoadingButton(
                  label: 'Importar PDF',
                  loading: state.importing,
                  onPressed: () => _import(context),
                ),
              _ImportStatus(state: state),
              for (final (i, book) in books.indexed) ...[
                const SizedBox(height: Spaces.md),
                EnterAnimation(
                  index: i,
                  child: BookCard(book: book, onTap: () => _openBook(context, book.id)),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _ImportStatus extends StatelessWidget {
  const _ImportStatus({required this.state});

  final LibraryState state;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final message = state.importing ? 'Processando PDF…' : state.importError;
    if (message == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: Spaces.sm),
      child: Semantics(
        liveRegion: true,
        child: Text(
          message,
          textAlign: TextAlign.center,
          style: text.bodyMedium?.copyWith(
            color: state.importing ? ReadUpColors.textSecondary : ReadUpColors.errorText,
          ),
        ),
      ),
    );
  }
}
