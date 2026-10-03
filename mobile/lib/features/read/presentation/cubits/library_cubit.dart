import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../domain/models/book.dart';
import '../../domain/repositories/books_repository.dart';

class LibraryState extends Equatable {
  const LibraryState({
    this.books,
    this.error,
    this.importing = false,
    this.importError,
    this.importedBookId,
  });

  /// null enquanto carrega
  final List<Book>? books;
  final String? error;
  final bool importing;

  /// tamanho, não é PDF, sem texto, limite de livros (mensagens do backend)
  final String? importError;

  /// livro recém-importado: a tela abre ele e avisa com [LibraryCubit.importedBookOpened]
  final int? importedBookId;

  LibraryState copyWith({
    List<Book>? books,
    String? Function()? error,
    bool? importing,
    String? Function()? importError,
    int? Function()? importedBookId,
  }) => LibraryState(
    books: books ?? this.books,
    error: error != null ? error() : this.error,
    importing: importing ?? this.importing,
    importError: importError != null ? importError() : this.importError,
    importedBookId: importedBookId != null ? importedBookId() : this.importedBookId,
  );

  @override
  List<Object?> get props => [books, error, importing, importError, importedBookId];
}

/// "Meus livros": PDFs da pessoa e a importação.
class LibraryCubit extends Cubit<LibraryState> {
  LibraryCubit({required this._books}) : super(const LibraryState());

  final BooksRepository _books;

  Future<void> load() async {
    try {
      final books = await _books.list();
      if (!isClosed) emit(state.copyWith(books: books, error: () => null));
    } on RequestFailure catch (failure) {
      // recarga falhando com a lista na tela: mantém a lista
      if (!isClosed && state.books == null) emit(state.copyWith(error: () => failure.message));
    }
  }

  Future<void> retry() async {
    emit(const LibraryState());
    await load();
  }

  Future<void> importPdf(String filePath) async {
    if (state.importing) return;
    emit(state.copyWith(importing: true, importError: () => null));
    try {
      final detail = await _books.upload(filePath);
      emit(state.copyWith(importing: false, importedBookId: () => detail.book.id));
      await load();
    } on RequestFailure catch (failure) {
      emit(state.copyWith(importing: false, importError: () => failure.message));
    }
  }

  void importedBookOpened() => emit(state.copyWith(importedBookId: () => null));
}
