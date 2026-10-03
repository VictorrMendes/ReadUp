import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/services/speech.dart';
import '../../../../design_system/motion.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/repositories/vocabulary_repository.dart';
import '../../../../shared/presentation/widgets/context_sentence.dart';
import '../../../../shared/presentation/widgets/count_up.dart';
import '../../../../shared/presentation/widgets/error_retry.dart';
import '../../../../shared/presentation/widgets/loading_button.dart';
import '../../../../shared/presentation/widgets/progress_bar.dart';
import '../../domain/review_session.dart';
import '../cubits/review_cubit.dart';
import '../widgets/flip_card.dart';

/// Revisão espaçada das palavras salvas.
class ReviewScreen extends StatelessWidget {
  const ReviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => ReviewCubit(vocabulary: context.read<VocabularyRepository>())..load(),
      child: const _ReviewView(),
    );
  }
}

class _ReviewView extends StatelessWidget {
  const _ReviewView();

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<ReviewCubit>();
    final state = context.watch<ReviewCubit>().state;
    final session = state.session;
    final item = session?.current;
    final total = session?.items.length ?? 0;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Fechar revisão',
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: session != null && total > 0
            ? ProgressBar(
                value: session.index / total,
                size: ProgressBarSize.thin,
                semanticLabel: 'Progresso da revisão',
              )
            : null,
      ),
      body: switch (state) {
        ReviewState(loadError: final error?) => ErrorRetry(message: error, onRetry: cubit.retry),
        _ when session == null => const Center(child: CircularProgressIndicator()),
        _ when item == null => _Summary(
          session: session,
          limitReached: state.queue?.limitReached ?? false,
        ),
        _ => _CardStep(session: session, item: item, state: state),
      },
    );
  }
}

class _CardStep extends StatelessWidget {
  const _CardStep({required this.session, required this.item, required this.state});

  final ReviewSession session;
  final SessionItem item;
  final ReviewState state;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final cubit = context.read<ReviewCubit>();
    final firstPass = session.firstPassTotal;
    final reduce = context.reduceMotion;
    // "já sei" sai para a direita; "ainda aprendendo" volta para a pilha (desce); o novo sobe
    final exitOffset = state.lastKnown ?? true ? const Offset(0.4, 0) : const Offset(0, 0.12);
    return ListView(
      padding: const EdgeInsets.all(Spaces.xl),
      children: [
        Semantics(
          liveRegion: true,
          child: Text(
            item.practice
                ? 'Treino extra'
                : '${(session.index + 1).clamp(1, firstPass)} de $firstPass',
            style: text.bodyMedium?.copyWith(color: ReadUpColors.textSecondary),
          ),
        ),
        const SizedBox(height: Spaces.md),
        AnimatedSwitcher(
          duration: reduce ? Duration.zero : const Duration(milliseconds: 260),
          switchInCurve: MotionCurves.enter,
          switchOutCurve: MotionCurves.exit,
          transitionBuilder: (child, animation) {
            final incoming = child.key == ValueKey(session.index);
            final slide = incoming
                ? Tween(begin: const Offset(0, 0.08), end: Offset.zero)
                : Tween(begin: exitOffset, end: Offset.zero);
            return FadeTransition(
              opacity: animation,
              child: SlideTransition(position: slide.animate(animation), child: child),
            );
          },
          child: KeyedSubtree(
            key: ValueKey(session.index),
            child: FlipCard(
              flipped: state.revealed,
              front: _Face(item: item, revealed: false),
              back: _Face(item: item, revealed: true),
            ),
          ),
        ),
        if (state.error case final error?) ...[
          const SizedBox(height: Spaces.md),
          Semantics(
            liveRegion: true,
            child: Text(error, style: text.bodyMedium?.copyWith(color: ReadUpColors.errorText)),
          ),
        ],
        const SizedBox(height: Spaces.xl),
        if (state.revealed)
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: state.sending ? null : () => cubit.answer(known: false),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(52), // mesma altura do "Já sei"
                    padding: const EdgeInsets.symmetric(horizontal: Spaces.sm),
                  ),
                  child: const Text('Ainda aprendendo', textAlign: TextAlign.center),
                ),
              ),
              const SizedBox(width: Spaces.md),
              Expanded(
                child: LoadingButton(
                  label: 'Já sei',
                  loading: state.sending,
                  onPressed: () async {
                    // acerto ganha um toque de sucesso; "ainda aprendendo" não vibra (sem punição)
                    if (await cubit.answer(known: true)) unawaited(Haptics.success());
                  },
                ),
              ),
            ],
          )
        else
          FilledButton(
            onPressed: cubit.reveal,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
            child: const Text('Mostrar tradução'),
          ),
      ],
    );
  }
}

class _Face extends StatelessWidget {
  const _Face({required this.item, required this.revealed});

  final SessionItem item;
  final bool revealed;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final card = item.card;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Spaces.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(card.word, style: context.readupText.readingTitle),
                  ),
                ),
                IconButton(
                  tooltip: 'Ouvir a pronúncia de ${card.word}',
                  icon: const Icon(Icons.volume_up_outlined, color: ReadUpColors.primary600),
                  onPressed: () => context.read<Speech>().speak(card.word),
                ),
              ],
            ),
            if (card.context case final sentence?) ...[
              const SizedBox(height: Spaces.md),
              ContextSentence(sentence: sentence, word: card.word),
            ],
            if (revealed) ...[
              const SizedBox(height: Spaces.lg),
              Semantics(
                liveRegion: true,
                child: Text(
                  card.translation ?? 'Sem tradução salva',
                  style: card.translation == null
                      ? text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary)
                      : text.headlineMedium,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Fim da sessão no mesmo estilo da conclusão de leitura: o que foi feito, sem vermelho.
class _Summary extends StatefulWidget {
  const _Summary({required this.session, required this.limitReached});

  final ReviewSession session;
  final bool limitReached;

  @override
  State<_Summary> createState() => _SummaryState();
}

class _SummaryState extends State<_Summary> {
  @override
  void initState() {
    super.initState();
    // fim de uma sessão de verdade: um toque de comemoração (sessão vazia não é conquista)
    if (!widget.session.empty) unawaited(Haptics.success());
  }

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final session = widget.session;
    final empty = session.empty;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(Spaces.xl),
        child: Column(
          children: [
            Image.asset('assets/images/mascot.png', height: 140, excludeFromSemantics: true),
            const SizedBox(height: Spaces.lg),
            Semantics(
              header: true,
              child: Text(
                empty ? 'Nada para revisar agora' : 'Revisão concluída',
                textAlign: TextAlign.center,
                style: text.headlineMedium,
              ),
            ),
            const SizedBox(height: Spaces.sm),
            if (empty)
              Text(
                widget.limitReached
                    ? 'Você já revisou o limite de palavras de hoje. Volte amanhã!'
                    : 'Palavras salvas entram na revisão no dia seguinte.',
                textAlign: TextAlign.center,
                style: text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary),
              )
            else ...[
              Row(
                children: [
                  Expanded(
                    child: _Count(
                      value: session.known,
                      label: 'já sabia',
                      color: ReadUpColors.success100,
                    ),
                  ),
                  const SizedBox(width: Spaces.md),
                  Expanded(
                    child: _Count(
                      value: session.learning,
                      label: 'ainda aprendendo',
                      color: ReadUpColors.surface,
                    ),
                  ),
                ],
              ),
              if (session.xp > 0) ...[
                const SizedBox(height: Spaces.lg),
                CountUp(
                  value: session.xp,
                  prefix: '+',
                  delay: const Duration(milliseconds: 300),
                  style: context.readupText.stat.copyWith(color: ReadUpColors.gold700),
                ),
                Text('XP', style: text.bodySmall?.copyWith(color: ReadUpColors.gold700)),
              ],
            ],
            const SizedBox(height: Spaces.xl),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Voltar ao vocabulário'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Count extends StatelessWidget {
  const _Count({required this.value, required this.label, required this.color});

  final int value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Spaces.lg),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(color: ReadUpColors.border),
      ),
      child: Column(
        children: [
          Text(value.formatted, style: context.readupText.stat),
          Text(
            label,
            textAlign: TextAlign.center,
            style: context.textTheme.bodySmall?.copyWith(color: ReadUpColors.textSecondary),
          ),
        ],
      ),
    );
  }
}
