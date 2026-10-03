import 'package:flutter/material.dart';

import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/constants/levels.dart';
import '../../../../shared/domain/models/article_summary.dart';
import '../widgets/library_view.dart';
import '../widgets/text_feed_view.dart';

enum ReadSection { texts, news, books }

/// Aba Ler: textos do nível da pessoa, notícias e os livros (PDFs) dela.
class ReadScreen extends StatefulWidget {
  const ReadScreen({super.key, required this.level});

  final EnglishLevel? level;

  @override
  State<ReadScreen> createState() => _ReadScreenState();
}

class _ReadScreenState extends State<ReadScreen> {
  var _section = ReadSection.texts;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ler')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(Spaces.lg, Spaces.md, Spaces.lg, 0),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<ReadSection>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(value: ReadSection.texts, label: Text('Para você')),
                  ButtonSegment(value: ReadSection.news, label: Text('Notícias')),
                  ButtonSegment(value: ReadSection.books, label: Text('Meus livros')),
                ],
                selected: {_section},
                onSelectionChanged: (selection) => setState(() => _section = selection.first),
              ),
            ),
          ),
          // key: cada seção começa do zero (filtro e lista próprios)
          Expanded(
            child: switch (_section) {
              ReadSection.texts => TextFeedView(
                key: const ValueKey('texts'),
                initialLevel: widget.level,
              ),
              ReadSection.news => TextFeedView(
                key: const ValueKey('news'),
                initialLevel: widget.level,
                category: ArticleSummary.newsCategory,
              ),
              ReadSection.books => const LibraryView(key: ValueKey('books')),
            },
          ),
        ],
      ),
    );
  }
}
