import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/services/speech.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/repositories/vocabulary_repository.dart';
import '../../../../shared/presentation/widgets/loading_button.dart';
import '../../../../shared/presentation/widgets/skeleton.dart';
import '../cubits/sentence_cubit.dart';
import '../cubits/word_cubit.dart';
import 'saved_check.dart';
import 'sentence_translation_view.dart';

/// Painel da palavra tocada: tradução, ouvir, a frase, traduzir a frase e salvar/remover.
/// [onSavedChanged]: o leitor atualiza o sublinhado das palavras salvas.
class WordSheet extends StatelessWidget {
  const WordSheet({
    super.key,
    required this.word,
    required this.sentence,
    required this.articleId,
    required this.onSavedChanged,
  });

  final String word;
  final String sentence;
  final int articleId;
  final VoidCallback onSavedChanged;

  @override
  Widget build(BuildContext context) {
    final vocabulary = context.read<VocabularyRepository>();
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => WordCubit(
            vocabulary: vocabulary,
            word: word,
            sentence: sentence,
            articleId: articleId,
          )..load(),
        ),
        BlocProvider(
          create: (_) =>
              SentenceCubit(vocabulary: vocabulary, articleId: articleId, sentence: sentence),
        ),
      ],
      child: _WordSheetBody(onSavedChanged: onSavedChanged),
    );
  }
}

class _WordSheetBody extends StatelessWidget {
  const _WordSheetBody({required this.onSavedChanged});

  final VoidCallback onSavedChanged;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final cubit = context.read<WordCubit>();
    final state = context.watch<WordCubit>().state;
    final sentenceState = context.watch<SentenceCubit>().state;
    final lookup = state.lookup;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Spaces.xl, 0, Spaces.xl, Spaces.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(cubit.word, style: context.readupText.readingTitle),
                  ),
                ),
                IconButton(
                  tooltip: 'Ouvir a pronúncia de ${cubit.word}',
                  icon: const Icon(Icons.volume_up_outlined, color: ReadUpColors.primary600),
                  onPressed: () => context.read<Speech>().speak(cubit.word),
                ),
              ],
            ),
            const SizedBox(height: Spaces.sm),
            if (lookup == null)
              Semantics(label: 'Carregando tradução', child: const Skeleton(height: 24, width: 180))
            else
              Text(
                lookup.translation ?? 'Tradução indisponível no momento',
                style: lookup.translation == null
                    ? text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary)
                    : text.titleLarge,
              ),
            const SizedBox(height: Spaces.md),
            Text(
              cubit.sentence,
              style: text.bodyMedium?.copyWith(color: ReadUpColors.textSecondary),
            ),
            const SizedBox(height: Spaces.sm),
            if (sentenceState is SentenceIdle)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: context.read<SentenceCubit>().translate,
                  icon: const Icon(Icons.translate),
                  label: const Text('Traduzir a frase'),
                ),
              )
            else
              const SentenceTranslationView(),
            if (state.error case final error?) ...[
              const SizedBox(height: Spaces.sm),
              Semantics(
                liveRegion: true,
                child: Text(error, style: text.bodyMedium?.copyWith(color: ReadUpColors.errorText)),
              ),
            ],
            const SizedBox(height: Spaces.lg),
            if (state.savedId != null)
              Row(
                children: [
                  SavedCheck(animate: state.justSaved),
                  const SizedBox(width: Spaces.sm),
                  Expanded(child: Text('Palavra salva', style: text.titleMedium)),
                  TextButton(
                    onPressed: state.busy
                        ? null
                        : () async {
                            if (await cubit.remove()) onSavedChanged();
                          },
                    child: const Text('Remover'),
                  ),
                ],
              )
            else
              LoadingButton(
                label: 'Salvar palavra',
                loading: state.busy,
                onPressed: lookup == null
                    ? null
                    : () async {
                        if (await cubit.save()) {
                          unawaited(Haptics.tap());
                          onSavedChanged();
                        }
                      },
              ),
          ],
        ),
      ),
    );
  }
}
