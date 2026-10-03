import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/stats.dart';
import '../../../../shared/presentation/widgets/progress_bar.dart';
import '../../domain/home_texts.dart';

/// Cartão herói do Início (a única sombra da tela): o número da meta, a barra e a próxima ação
/// a um toque.
class DailyGoalCard extends StatelessWidget {
  const DailyGoalCard({
    super.key,
    required this.goal,
    required this.target,
    required this.actionLabel,
    required this.onAction,
  });

  final GoalStatus goal;
  final int target;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final percent = (goal.wordsToday / target * 100).floor().clamp(0, 100);
    final extras = (goal.wordsToday - target).clamp(0, goal.wordsToday);
    final minutes = minutesLeft(goal.remaining);
    // cinza sobre success100 daria 4.33:1 (abaixo de AA): concluída usa texto escuro
    final secondary = goal.completed ? ReadUpColors.textPrimary : ReadUpColors.textSecondary;
    final status = goal.completed
        ? (extras > 0 ? 'Meta cumprida · +${extras.formatted} extras' : 'Meta cumprida')
        : '≈ $minutes min de leitura para fechar';

    return DecoratedBox(
      decoration: BoxDecoration(
        color: goal.completed ? ReadUpColors.success100 : ReadUpColors.surface,
        borderRadius: BorderRadius.circular(Radii.card),
        border: Border.all(color: goal.completed ? ReadUpColors.success500 : Colors.transparent),
        boxShadow: const [
          BoxShadow(color: Color(0x141C1917), blurRadius: 12, offset: Offset(0, 4)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(Spaces.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            MergeSemantics(
              child: Semantics(
                container: true,
                label:
                    'Meta de hoje: ${goal.wordsToday.formatted} de ${target.formatted} palavras, '
                    '$percent%. $status',
                excludeSemantics: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'META DE HOJE',
                            style: text.labelSmall?.copyWith(color: secondary),
                          ),
                        ),
                        Text(
                          '$percent%',
                          style: text.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: goal.completed
                                ? ReadUpColors.success700
                                : ReadUpColors.primary600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: Spaces.sm),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.end,
                      spacing: Spaces.sm,
                      children: [
                        Text(goal.wordsToday.formatted, style: context.readupText.hero),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Text(
                            '/ ${target.formatted} palavras',
                            style: text.bodyLarge?.copyWith(color: secondary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: Spaces.md),
                    ProgressBar(
                      value: goal.wordsToday / target,
                      size: ProgressBarSize.large,
                      color: goal.completed ? ReadUpColors.success500 : ReadUpColors.primary500,
                    ),
                    const SizedBox(height: Spaces.md),
                    Row(
                      children: [
                        Icon(
                          goal.completed ? Icons.check_circle : Icons.schedule,
                          size: 16,
                          color: goal.completed
                              ? ReadUpColors.success600
                              : ReadUpColors.textPrimary,
                        ),
                        const SizedBox(width: Spaces.xs),
                        Expanded(child: Text(status, style: text.bodyMedium)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: Spaces.lg),
            if (goal.completed)
              OutlinedButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.menu_book),
                label: Text(actionLabel),
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
              )
            else
              FilledButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.menu_book),
                label: Text(actionLabel),
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
              ),
          ],
        ),
      ),
    );
  }
}
