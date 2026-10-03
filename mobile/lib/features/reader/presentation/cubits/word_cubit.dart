import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../shared/domain/models/vocabulary.dart';
import '../../../../shared/domain/repositories/vocabulary_repository.dart';

class WordState extends Equatable {
  const WordState({
    this.lookup,
    this.savedId,
    this.busy = false,
    this.error,
    this.justSaved = false,
  });

  /// null enquanto carrega
  final Lookup? lookup;

  /// id da palavra salva (do lookup ou do salvar deste painel); null = não salva
  final int? savedId;
  final bool busy;
  final String? error;

  /// salva agora, neste painel: o ícone dá um salto (recompensa imediata); já salva antes, não
  final bool justSaved;

  @override
  List<Object?> get props => [lookup, savedId, busy, error, justSaved];
}

/// Painel da palavra tocada: tradução e salvar/remover, sem tirar a pessoa da leitura.
class WordCubit extends Cubit<WordState> {
  WordCubit({
    required this._vocabulary,
    required this.word,
    required this.sentence,
    required this.articleId,
  }) : super(const WordState());

  final VocabularyRepository _vocabulary;
  final String word;
  final String sentence;
  final int articleId;

  Future<void> load() async {
    try {
      final lookup = await _vocabulary.lookup(word);
      if (!isClosed) emit(WordState(lookup: lookup, savedId: lookup.savedId));
    } on RequestFailure {
      if (!isClosed) emit(WordState(lookup: Lookup(word: word, translation: null, savedId: null)));
    }
  }

  /// true quando salvou (a tela vibra e atualiza o sublinhado).
  Future<bool> save() async {
    if (state.busy) return false;
    emit(WordState(lookup: state.lookup, savedId: state.savedId, busy: true));
    try {
      final saved = await _vocabulary.save(word: word, articleId: articleId, context: sentence);
      emit(WordState(lookup: state.lookup, savedId: saved.id, justSaved: true));
      return true;
    } on RequestFailure {
      emit(WordState(lookup: state.lookup, error: 'Não foi possível salvar. Tente novamente.'));
      return false;
    }
  }

  Future<bool> remove() async {
    final id = state.savedId;
    if (id == null || state.busy) return false;
    emit(WordState(lookup: state.lookup, savedId: id, busy: true));
    try {
      await _vocabulary.delete(id);
      emit(WordState(lookup: state.lookup));
      return true;
    } on RequestFailure {
      emit(
        WordState(
          lookup: state.lookup,
          savedId: id,
          error: 'Não foi possível remover. Tente novamente.',
        ),
      );
      return false;
    }
  }
}
