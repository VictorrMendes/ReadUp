import 'package:equatable/equatable.dart';

/// Tradução de uma palavra e se ela já está salva.
class Lookup extends Equatable {
  const Lookup({required this.word, required this.translation, required this.savedId});

  factory Lookup.fromJson(Map<String, Object?> json) => Lookup(
    word: json['word']! as String,
    translation: json['translation'] as String?,
    savedId: json['saved_id'] as int?,
  );

  final String word;

  /// null: tradução indisponível no momento
  final String? translation;

  /// id da palavra salva do usuário; null = não salva
  final int? savedId;

  @override
  List<Object?> get props => [word, translation, savedId];
}

class SavedWord extends Equatable {
  const SavedWord({
    required this.id,
    required this.word,
    required this.translation,
    required this.context,
    required this.articleId,
    required this.articleTitle,
  });

  factory SavedWord.fromJson(Map<String, Object?> json) => SavedWord(
    id: json['id']! as int,
    word: json['word']! as String,
    translation: json['translation'] as String?,
    context: json['context'] as String?,
    articleId: json['article_id'] as int?,
    articleTitle: json['article_title'] as String?,
  );

  final int id;
  final String word;
  final String? translation;

  /// a frase onde a palavra foi salva
  final String? context;
  final int? articleId;
  final String? articleTitle;

  @override
  List<Object?> get props => [id, word, translation, context];
}
