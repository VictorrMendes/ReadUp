import 'package:equatable/equatable.dart';

import '../../../shared/domain/models/review.dart';

class SessionItem extends Equatable {
  const SessionItem({required this.card, required this.practice});

  final ReviewCard card;

  /// treino extra (segunda passada de "ainda aprendendo"): não vai para o servidor
  final bool practice;

  @override
  List<Object?> get props => [card, practice];
}

/// Sessão de revisão: cada cartão da fila é respondido uma vez "de verdade" (o servidor move a
/// caixa). "Ainda aprendendo" põe o cartão de novo no fim como treino extra.
class ReviewSession extends Equatable {
  const ReviewSession({
    required this.items,
    this.index = 0,
    this.known = 0,
    this.learning = 0,
    this.xp = 0,
  });

  factory ReviewSession.start(List<ReviewCard> cards) =>
      ReviewSession(items: [for (final card in cards) SessionItem(card: card, practice: false)]);

  final List<SessionItem> items;
  final int index;

  /// acertos e "ainda aprendendo" na primeira passada
  final int known;
  final int learning;
  final int xp;

  SessionItem? get current => index < items.length ? items[index] : null;

  /// cartões de primeira passada (o total "de verdade")
  int get firstPassTotal => items.where((i) => !i.practice).length;

  bool get empty => items.isEmpty;

  /// Avança depois da resposta; [xp] é o que o servidor deu (0 no treino extra).
  ReviewSession advance({required bool known, int xp = 0}) {
    final item = current;
    if (item == null) return this;
    final retry = !known && !item.practice;
    return ReviewSession(
      items: retry ? [...items, SessionItem(card: item.card, practice: true)] : items,
      index: index + 1,
      known: this.known + (!item.practice && known ? 1 : 0),
      learning: learning + (!item.practice && !known ? 1 : 0),
      xp: this.xp + xp,
    );
  }

  @override
  List<Object?> get props => [items, index, known, learning, xp];
}
