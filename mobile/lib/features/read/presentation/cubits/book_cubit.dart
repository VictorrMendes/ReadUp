import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../domain/models/book.dart';
import '../../domain/repositories/books_repository.dart';

class BookState extends Equatable {
  const BookState({
    this.detail,
    this.error,
    this.notFound = false,
    this.deleteError,
    this.deleted = false,
  });

  final BookDetail? detail;
  final String? error;
  final bool notFound;
  final String? deleteError;

  /// removido: a tela volta
  final bool deleted;

  @override
  List<Object?> get props => [detail, error, notFound, deleteError, deleted];
}

/// Tela do livro: capítulos com progresso, "continuar leitura" e remover.
class BookCubit extends Cubit<BookState> {
  BookCubit({required this._books, required this.bookId}) : super(const BookState());

  final BooksRepository _books;
  final int bookId;

  Future<void> load() async {
    try {
      final detail = await _books.get(bookId);
      if (!isClosed) emit(BookState(detail: detail));
    } on RequestFailure catch (failure) {
      if (isClosed || state.detail != null) return;
      emit(BookState(error: failure.message, notFound: failure.code == 404));
    }
  }

  Future<void> retry() async {
    emit(const BookState());
    await load();
  }

  Future<void> delete() async {
    try {
      await _books.delete(bookId);
      emit(BookState(detail: state.detail, deleted: true));
    } on RequestFailure {
      emit(
        BookState(
          detail: state.detail,
          deleteError: 'Não foi possível remover o livro. Tente novamente.',
        ),
      );
    }
  }
}
