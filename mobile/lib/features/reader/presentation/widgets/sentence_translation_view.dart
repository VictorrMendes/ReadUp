import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../shared/presentation/widgets/skeleton.dart';
import '../cubits/sentence_cubit.dart';

/// Estado da tradução de frase (carregando, traduzida, limite/indisponível).
class SentenceTranslationView extends StatelessWidget {
  const SentenceTranslationView({super.key});

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    return switch (context.watch<SentenceCubit>().state) {
      SentenceIdle() => const SizedBox.shrink(),
      SentenceLoading() => Semantics(
        label: 'Traduzindo a frase',
        child: const Skeleton(height: 20, width: 240),
      ),
      SentenceTranslated(:final translation) => Semantics(
        liveRegion: true,
        child: Text(translation ?? SentenceCubit.unavailable, style: text.bodyLarge),
      ),
      SentenceFailure(:final message) => Semantics(
        liveRegion: true,
        child: Text(message, style: text.bodyMedium?.copyWith(color: ReadUpColors.textSecondary)),
      ),
    };
  }
}
