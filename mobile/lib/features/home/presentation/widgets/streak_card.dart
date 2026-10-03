import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/stats.dart';
import '../../domain/home_texts.dart';
import 'streak_flame.dart';
import 'week_strip.dart';

/// Ofensiva com a semana visível: escudos, chama dourada com a meta batida e, quebrada, o total
/// que nunca zera em destaque (autocompaixão, plan.txt §4.5).
class StreakCard extends StatelessWidget {
  const StreakCard({super.key, required this.summary, required this.goalMetToday, this.week});

  final StatsSummary summary;
  final bool goalMetToday;
  final List<DailyStat>? week;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final current = summary.streakCurrent;
    final caption = streakCaption(
      current: current,
      longest: summary.streakLongest,
      activeToday: summary.streakActiveToday,
      goalMetToday: goalMetToday,
    );
    final broken = current == 0 && summary.streakLongest > 0;
    final showFreezes = current > 0;
    final label = [
      'Ofensiva de ${current.asDays}. $caption',
      if (showFreezes) freezesLabel(summary.streakFreezes),
      if (broken) 'Você já leu ${summary.wordsTotal.formatted} palavras',
    ].join('. ');

    return DecoratedBox(
      decoration: BoxDecoration(
        color: ReadUpColors.streak50,
        borderRadius: BorderRadius.circular(Radii.card),
        border: Border.all(color: ReadUpColors.streak100),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              container: true,
              label: label,
              excludeSemantics: true,
              child: Row(
                children: [
                  StreakFlame(active: summary.streakActiveToday, golden: goalMetToday),
                  const SizedBox(width: Spaces.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(current.asDays, style: text.headlineMedium),
                        Text(
                          caption,
                          style: text.bodyMedium?.copyWith(color: ReadUpColors.streak700),
                        ),
                        if (showFreezes) ...[
                          const SizedBox(height: Spaces.xs),
                          Row(
                            children: [
                              const Icon(Icons.shield, size: 14, color: ReadUpColors.streak700),
                              const SizedBox(width: Spaces.xs),
                              Flexible(
                                child: Text(
                                  freezesLabel(summary.streakFreezes),
                                  style: text.bodySmall?.copyWith(color: ReadUpColors.streak700),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (broken) ...[
              const SizedBox(height: Spaces.md),
              ExcludeSemantics(
                child: Text.rich(
                  TextSpan(
                    text: 'Você já leu ',
                    children: [
                      TextSpan(
                        text: summary.wordsTotal.formatted,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const TextSpan(text: ' palavras.'),
                    ],
                  ),
                  style: text.bodyLarge,
                ),
              ),
            ],
            if (week case final days? when days.isNotEmpty) ...[
              const SizedBox(height: Spaces.lg),
              WeekStrip(days: days),
            ],
          ],
        ),
      ),
    );
  }
}
