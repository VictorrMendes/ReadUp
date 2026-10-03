import 'package:equatable/equatable.dart';

import '../../../../shared/domain/models/article_summary.dart';

/// Texto aberto no leitor.
class ArticleDetail extends Equatable {
  const ArticleDetail({
    required this.summary,
    required this.content,
    this.nextArticleId,
    this.sourceUrl,
    this.attribution,
  });

  factory ArticleDetail.fromJson(Map<String, Object?> json) => ArticleDetail(
    summary: ArticleSummary.fromJson(json),
    content: json['content']! as String,
    nextArticleId: json['next_article_id'] as int?,
    sourceUrl: json['source_url'] as String?,
    attribution: json['attribution'] as String?,
  );

  final ArticleSummary summary;
  final String content;

  /// próximo capítulo do mesmo livro
  final int? nextArticleId;

  /// link original (notícias)
  final String? sourceUrl;

  /// crédito da fonte (notícias); null para textos do app e PDFs
  final String? attribution;

  /// Parágrafos separados por linha em branco.
  List<String> get paragraphs => [
    for (final p in content.split(RegExp(r'\n\s*\n')))
      if (p.trim().isNotEmpty) p.trim(),
  ];

  @override
  List<Object?> get props => [summary, content, nextArticleId];
}
