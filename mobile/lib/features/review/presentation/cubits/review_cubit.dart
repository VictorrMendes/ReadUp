import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../shared/domain/models/review.dart';
import '../../../../shared/domain/repositories/vocabulary_repository.dart';
import '../../domain/review_session.dart';

class ReviewState extends Equatable {
  const ReviewState({
    this.queue,
    this.session,
    this.revealed = false,
    this.sending = false,
    this.error,
    this.loadError,
    this.lastKnown,
  });

  final ReviewQueue? queue;
  final ReviewSession? session;

  /// tradução à mostra (o cartão virou)
  final bool revealed;
  final bool sending;
  final String? error;
  final String? loadError;

  /// última resposta (a tela anima a saída: "já sei" para a direita, "ainda aprendendo" para a pilha)
  final bool? lastKnown;

  @override
  List<Object?> get props => [queue, session, revealed, sending, error, loadError, lastKnown];
}

/// Revisão espaçada: mostrar a tradução, "ainda aprendendo" ou "já sei".
class ReviewCubit extends Cubit<ReviewState> {
  ReviewCubit({required this._vocabulary}) : super(const ReviewState());

  final VocabularyRepository _vocabulary;

  /// A fila é lida uma vez por sessão: buscar de novo no meio trocaria os cartões.
  Future<void> load() async {
    try {
      final queue = await _vocabulary.reviewQueue();
      if (!isClosed) emit(ReviewState(queue: queue, session: ReviewSession.start(queue.cards)));
    } on RequestFailure catch (failure) {
      if (!isClosed) emit(ReviewState(loadError: failure.message));
    }
  }

  Future<void> retry() async {
    emit(const ReviewState());
    await load();
  }

  void reveal() {
    if (state.session?.current == null || state.revealed) return;
    emit(
      ReviewState(
        queue: state.queue,
        session: state.session,
        revealed: true,
        lastKnown: state.lastKnown,
      ),
    );
  }

  /// Responde o cartão atual. true quando acertou de verdade (a tela vibra).
  Future<bool> answer({required bool known}) async {
    final session = state.session;
    final item = session?.current;
    if (session == null || item == null || state.sending || !state.revealed) return false;
    // treino extra: a palavra já voltou para a caixa 0 no servidor, só avança aqui
    if (item.practice) {
      _next(session.advance(known: known), known);
      return false;
    }
    emit(
      ReviewState(
        queue: state.queue,
        session: session,
        revealed: true,
        sending: true,
        lastKnown: state.lastKnown,
      ),
    );
    try {
      final xp = await _vocabulary.answerReview(item.card.id, known: known);
      _next(session.advance(known: known, xp: xp), known);
      return known;
    } on RequestFailure catch (failure) {
      if (failure.code == 409) {
        // já respondida ou limite do dia (ex.: outro aparelho): segue sem contar
        _next(session.advance(known: known), known);
        return false;
      }
      emit(
        ReviewState(
          queue: state.queue,
          session: session,
          revealed: true,
          error: 'Não foi possível salvar a resposta. Tente de novo.',
          lastKnown: state.lastKnown,
        ),
      );
      return false;
    }
  }

  void _next(ReviewSession session, bool known) =>
      emit(ReviewState(queue: state.queue, session: session, lastKnown: known));
}
