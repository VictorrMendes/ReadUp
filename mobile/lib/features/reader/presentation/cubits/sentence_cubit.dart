import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../shared/domain/repositories/vocabulary_repository.dart';

sealed class SentenceState extends Equatable {
  const SentenceState();

  @override
  List<Object?> get props => [];
}

/// ainda não pediu (painel da palavra: "Traduzir a frase")
final class SentenceIdle extends SentenceState {
  const SentenceIdle();
}

final class SentenceLoading extends SentenceState {
  const SentenceLoading();
}

final class SentenceTranslated extends SentenceState {
  const SentenceTranslated(this.translation);

  /// null: indisponível no momento
  final String? translation;

  @override
  List<Object?> get props => [translation];
}

final class SentenceFailure extends SentenceState {
  const SentenceFailure(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}

/// Tradução de uma frase do texto (limite diário no backend).
class SentenceCubit extends Cubit<SentenceState> {
  SentenceCubit({required this._vocabulary, required this.articleId, required this.sentence})
    : super(const SentenceIdle());

  static const unavailable = 'Tradução da frase indisponível no momento.';
  static const limitReached = 'Você atingiu o limite de traduções de frase de hoje. Volte amanhã!';

  final VocabularyRepository _vocabulary;
  final int articleId;
  final String sentence;

  Future<void> translate() async {
    if (state is SentenceLoading) return;
    emit(const SentenceLoading());
    try {
      final translation = await _vocabulary.translateSentence(articleId: articleId, text: sentence);
      if (!isClosed) emit(SentenceTranslated(translation));
    } on RequestFailure catch (failure) {
      if (!isClosed) emit(SentenceFailure(failure.code == 429 ? limitReached : unavailable));
    }
  }
}
