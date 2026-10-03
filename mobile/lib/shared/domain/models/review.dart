import 'package:equatable/equatable.dart';

/// Palavra na fila de revisão espaçada (regras no backend: app/vocabulary/review.py).
class ReviewCard extends Equatable {
  const ReviewCard({
    required this.id,
    required this.word,
    required this.translation,
    required this.context,
  });

  factory ReviewCard.fromJson(Map<String, Object?> json) => ReviewCard(
    id: json['id']! as int,
    word: json['word']! as String,
    translation: json['translation'] as String?,
    context: json['context'] as String?,
  );

  final int id;
  final String word;
  final String? translation;
  final String? context;

  @override
  List<Object?> get props => [id, word];
}

class ReviewQueue extends Equatable {
  const ReviewQueue({required this.cards, required this.reviewedToday, required this.dailyLimit});

  factory ReviewQueue.fromJson(Map<String, Object?> json) => ReviewQueue(
    cards: [
      for (final item in json['cards']! as List<Object?>)
        ReviewCard.fromJson(item! as Map<String, Object?>),
    ],
    reviewedToday: json['reviewed_today']! as int,
    dailyLimit: json['daily_limit']! as int,
  );

  /// para revisar agora (já dentro do limite diário)
  final List<ReviewCard> cards;
  final int reviewedToday;
  final int dailyLimit;

  bool get limitReached => reviewedToday >= dailyLimit;

  @override
  List<Object?> get props => [cards, reviewedToday, dailyLimit];
}
