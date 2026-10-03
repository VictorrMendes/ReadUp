import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../shared/domain/models/vocabulary.dart';
import '../../../../shared/domain/repositories/vocabulary_repository.dart';

class VocabularyState extends Equatable {
  const VocabularyState({this.words, this.toReview, this.error, this.removeFailed = false});

  /// null enquanto carrega
  final List<SavedWord>? words;

  /// palavras para revisar agora (null: indisponível, o cartão de revisão some)
  final int? toReview;
  final String? error;

  /// remover falhou (a tela avisa)
  final bool removeFailed;

  @override
  List<Object?> get props => [words, toReview, error, removeFailed];
}

/// Aba Vocabulário: palavras salvas e quantas estão na revisão de hoje.
class VocabularyCubit extends Cubit<VocabularyState> {
  VocabularyCubit({required this._vocabulary}) : super(const VocabularyState());

  final VocabularyRepository _vocabulary;

  Future<void> load() async {
    // falha só da fila esconde o cartão de revisão
    final queue = _vocabulary.reviewQueue().then(
      (q) => q.cards.length as int?,
      onError: (_) => null,
    );
    try {
      final words = await _vocabulary.list();
      if (!isClosed) emit(VocabularyState(words: words, toReview: await queue));
    } on RequestFailure catch (failure) {
      if (!isClosed && state.words == null) emit(VocabularyState(error: failure.message));
    }
  }

  Future<void> retry() async {
    emit(const VocabularyState());
    await load();
  }

  Future<void> remove(SavedWord word) async {
    try {
      await _vocabulary.delete(word.id);
      emit(
        VocabularyState(
          words: [...?state.words?.where((w) => w.id != word.id)],
          toReview: state.toReview,
        ),
      );
    } on RequestFailure {
      emit(VocabularyState(words: state.words, toReview: state.toReview, removeFailed: true));
    }
  }
}
