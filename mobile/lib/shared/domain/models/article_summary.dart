import 'package:equatable/equatable.dart';

import '../constants/levels.dart';

class ArticleSummary extends Equatable {
  const ArticleSummary({
    required this.id,
    required this.title,
    required this.category,
    required this.difficulty,
    required this.wordCount,
    required this.estimatedMinutes,
    required this.source,
    required this.progress,
    required this.completed,
    this.bookId,
    this.bookTitle,
  });

  factory ArticleSummary.fromJson(Map<String, Object?> json) => ArticleSummary(
    id: json['id']! as int,
    title: json['title']! as String,
    category: json['category']! as String,
    difficulty: EnglishLevel.fromCode(json['difficulty'] as String?),
    wordCount: json['word_count']! as int,
    estimatedMinutes: json['estimated_minutes']! as int,
    source: json['source']! as String,
    progress: json['progress']! as int,
    completed: json['completed']! as bool,
    bookId: json['book_id'] as int?,
    bookTitle: json['book_title'] as String?,
  );

  static const newsCategory = 'Notícias';

  final int id;
  final String title;
  final String category;
  final EnglishLevel? difficulty;
  final int wordCount;
  final int estimatedMinutes;
  final String source;

  /// progresso do usuário logado (0–100)
  final int progress;
  final bool completed;

  /// capítulo de um PDF do usuário; null = texto do feed
  final int? bookId;
  final String? bookTitle;

  bool get inProgress => progress > 0 && !completed;

  @override
  List<Object?> get props => [id, title, progress, completed];
}

/// "Próximo texto" / "Ler um texto": o primeiro não concluído da lista (já filtrada pelo nível),
/// fora o atual. Prefere um que a pessoa ainda não começou.
ArticleSummary? pickNextText(List<ArticleSummary> articles, {int? excludeId}) {
  final open = articles.where((a) => !a.completed && a.id != excludeId).toList();
  for (final article in open) {
    if (article.progress == 0) return article;
  }
  return open.isEmpty ? null : open.first;
}
