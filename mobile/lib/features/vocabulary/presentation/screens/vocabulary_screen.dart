import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/routes/routes_path.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/vocabulary.dart';
import '../../../../shared/presentation/widgets/context_sentence.dart';
import '../../../../shared/presentation/widgets/empty_state.dart';
import '../../../../shared/presentation/widgets/enter_animation.dart';
import '../../../../shared/presentation/widgets/error_retry.dart';
import '../../../../shared/presentation/widgets/skeleton.dart';
import '../../../home_tabs/presentation/cubits/home_tabs_cubit.dart';
import '../cubits/vocabulary_cubit.dart';

/// Aba Vocabulário: a revisão de hoje e as palavras salvas na leitura.
class VocabularyScreen extends StatelessWidget {
  const VocabularyScreen({super.key});

  Future<void> _openReview(BuildContext context) async {
    await Navigator.of(context).pushNamed(RoutesPath.review);
    // voltou da revisão: a fila de hoje mudou
    if (context.mounted) await context.read<VocabularyCubit>().load();
  }

  Future<void> _confirmRemove(BuildContext context, SavedWord word) async {
    final cubit = context.read<VocabularyCubit>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remover palavra'),
        content: Text('Remover "${word.word}" do seu vocabulário?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: ReadUpColors.errorText),
            child: const Text('Remover'),
          ),
        ],
      ),
    );
    if (confirmed ?? false) await cubit.remove(word);
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<VocabularyCubit>();
    return Scaffold(
      appBar: AppBar(title: const Text('Vocabulário')),
      body: BlocConsumer<VocabularyCubit, VocabularyState>(
        listenWhen: (previous, current) => current.removeFailed && !previous.removeFailed,
        listener: (context, _) => ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível remover a palavra. Tente novamente.')),
        ),
        builder: (context, state) {
          final words = state.words;
          if (state.error case final error?) {
            return ErrorRetry(message: error, onRetry: cubit.retry);
          }
          if (words == null) {
            return Semantics(
              label: 'Carregando palavras',
              child: const Padding(
                padding: EdgeInsets.all(Spaces.lg),
                child: Column(
                  children: [
                    Skeleton(height: 110),
                    SizedBox(height: Spaces.md),
                    Skeleton(height: 110),
                  ],
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: cubit.load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(Spaces.lg, Spaces.lg, Spaces.lg, Spaces.xl),
              children: [
                if (words.isEmpty)
                  EmptyState(
                    illustration: 'assets/images/empty-vocabulary.png',
                    title: 'Nenhuma palavra salva ainda',
                    message: 'Toque em uma palavra durante a leitura para salvá-la aqui.',
                    actionLabel: 'Ver textos',
                    onAction: () => context.read<HomeTabsCubit>().select(HomeTab.read),
                  )
                else if (state.toReview case final count?)
                  _ReviewCard(count: count, onReview: () => _openReview(context)),
                for (final (i, word) in words.indexed) ...[
                  const SizedBox(height: Spaces.md),
                  EnterAnimation(
                    index: i,
                    child: _WordCard(word: word, onRemove: () => _confirmRemove(context, word)),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.count, required this.onReview});

  final int count;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final words = '${count.formatted} ${count == 1 ? 'palavra' : 'palavras'}';
    return Card(
      color: ReadUpColors.primary50,
      child: Padding(
        padding: const EdgeInsets.all(Spaces.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'REVISÃO DE HOJE',
              style: text.labelSmall?.copyWith(color: ReadUpColors.primary700),
            ),
            const SizedBox(height: Spaces.xs),
            Text(
              count > 0
                  ? '$words a revisar · ~${(count * 6 / 60).ceil()} min'
                  : 'Nada para revisar agora. Palavras salvas entram na revisão no dia seguinte.',
              style: text.bodyLarge,
            ),
            if (count > 0) ...[
              const SizedBox(height: Spaces.md),
              FilledButton.icon(
                onPressed: onReview,
                icon: const Icon(Icons.style_outlined),
                label: Text('Revisar (${count.formatted})'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _WordCard extends StatelessWidget {
  const _WordCard({required this.word, required this.onRemove});

  final SavedWord word;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Spaces.lg, Spaces.md, Spaces.xs, Spaces.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(word.word, style: context.readupText.cardTitle),
                  const SizedBox(height: 2),
                  Text(
                    word.translation ?? 'Sem tradução',
                    style: word.translation == null
                        ? text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary)
                        : text.bodyLarge,
                  ),
                  if (word.context case final sentence?) ...[
                    const SizedBox(height: Spaces.xs),
                    ContextSentence(sentence: sentence, word: word.word, maxLines: 2),
                  ],
                  if (word.articleTitle case final title?) ...[
                    const SizedBox(height: Spaces.xs),
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.bodySmall?.copyWith(color: ReadUpColors.textSecondary),
                    ),
                  ],
                ],
              ),
            ),
            IconButton(
              tooltip: 'Remover ${word.word}',
              icon: const Icon(Icons.delete_outline, color: ReadUpColors.textSecondary),
              onPressed: onRemove,
            ),
          ],
        ),
      ),
    );
  }
}
