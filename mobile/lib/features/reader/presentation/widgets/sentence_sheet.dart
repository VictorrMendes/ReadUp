import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/services/speech.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/repositories/vocabulary_repository.dart';
import '../cubits/sentence_cubit.dart';
import 'sentence_translation_view.dart';

/// Painel da frase escolhida (segurar): já traduz ao abrir; dá para ouvir.
class SentenceSheet extends StatelessWidget {
  const SentenceSheet({super.key, required this.sentence, required this.articleId});

  final String sentence;
  final int articleId;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    return BlocProvider(
      create: (context) => SentenceCubit(
        vocabulary: context.read<VocabularyRepository>(),
        articleId: articleId,
        sentence: sentence,
      )..translate(),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Spaces.xl, 0, Spaces.xl, Spaces.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                header: true,
                child: Text(
                  'FRASE',
                  style: text.labelSmall?.copyWith(color: ReadUpColors.primary700),
                ),
              ),
              const SizedBox(height: Spaces.sm),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: Text(sentence, style: context.readupText.reading)),
                  IconButton(
                    tooltip: 'Ouvir a frase',
                    icon: const Icon(Icons.volume_up_outlined, color: ReadUpColors.primary600),
                    onPressed: () => context.read<Speech>().speak(sentence),
                  ),
                ],
              ),
              const SizedBox(height: Spaces.md),
              const SentenceTranslationView(),
              const SizedBox(height: Spaces.md),
              Text(
                'Dica: toque numa palavra para ver a tradução dela e salvá-la.',
                style: text.bodySmall?.copyWith(color: ReadUpColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
