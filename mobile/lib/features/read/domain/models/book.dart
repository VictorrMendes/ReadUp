import 'package:equatable/equatable.dart';

import '../../../../shared/domain/models/article_summary.dart';

/// PDF importado pela pessoa (privado dela).
class Book extends Equatable {
  const Book({
    required this.id,
    required this.title,
    required this.pageCount,
    required this.wordCount,
    required this.chapterCount,
    required this.wordsRead,
    required this.progress,
  });

  factory Book.fromJson(Map<String, Object?> json) => Book(
    id: json['id']! as int,
    title: json['title']! as String,
    pageCount: json['page_count']! as int,
    wordCount: json['word_count']! as int,
    chapterCount: json['chapter_count']! as int,
    wordsRead: json['words_read']! as int,
    progress: json['progress']! as int,
  );

  final int id;
  final String title;
  final int pageCount;
  final int wordCount;
  final int chapterCount;
  final int wordsRead;

  /// 0–100
  final int progress;

  @override
  List<Object?> get props => [id, title, wordsRead, progress, chapterCount];
}

class Chapter extends Equatable {
  const Chapter({
    required this.id,
    required this.title,
    required this.position,
    required this.wordCount,
    required this.estimatedMinutes,
    required this.progress,
    required this.completed,
  });

  factory Chapter.fromJson(Map<String, Object?> json) => Chapter(
    id: json['id']! as int,
    title: json['title']! as String,
    position: json['position']! as int,
    wordCount: json['word_count']! as int,
    estimatedMinutes: json['estimated_minutes']! as int,
    progress: json['progress']! as int,
    completed: json['completed']! as bool,
  );

  final int id;
  final String title;
  final int position;
  final int wordCount;
  final int estimatedMinutes;
  final int progress;
  final bool completed;

  /// O capítulo no formato do cartão de leitura ("Capítulo 3" no lugar da categoria).
  ArticleSummary toSummary() => ArticleSummary(
    id: id,
    title: title,
    category: 'Capítulo $position',
    difficulty: null,
    wordCount: wordCount,
    estimatedMinutes: estimatedMinutes,
    source: '',
    progress: progress,
    completed: completed,
  );

  @override
  List<Object?> get props => [id, title, progress, completed];
}

class BookDetail extends Equatable {
  const BookDetail({required this.book, required this.chapters});

  factory BookDetail.fromJson(Map<String, Object?> json) => BookDetail(
    book: Book.fromJson(json),
    chapters: [
      for (final item in json['chapters']! as List<Object?>)
        Chapter.fromJson(item! as Map<String, Object?>),
    ],
  );

  final Book book;
  final List<Chapter> chapters;

  /// "Continuar leitura": o primeiro capítulo não concluído; se todos foram, o primeiro.
  Chapter? get continueChapter {
    for (final chapter in chapters) {
      if (!chapter.completed) return chapter;
    }
    return chapters.isEmpty ? null : chapters.first;
  }

  @override
  List<Object?> get props => [book, chapters];
}
