import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/achievement.dart';
import '../../../../shared/presentation/widgets/progress_bar.dart';

/// A conquista bloqueada mais perto de sair (gradiente de meta). Dourado = recompensa.
class NextAchievementCard extends StatelessWidget {
  const NextAchievementCard({super.key, required this.achievement});

  final Achievement achievement;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final remaining = achievement.remainingLabel;
    return Semantics(
      container: true,
      label: 'Próxima conquista: ${achievement.title}, $remaining',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.all(Spaces.lg),
        decoration: BoxDecoration(
          color: ReadUpColors.gold50,
          borderRadius: BorderRadius.circular(Radii.card),
          border: Border.all(color: ReadUpColors.gold100),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: ReadUpColors.gold100,
                border: Border.all(color: ReadUpColors.gold600, width: 2),
              ),
              child: Icon(achievement.iconData, size: 22, color: ReadUpColors.gold700),
            ),
            const SizedBox(width: Spaces.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'PRÓXIMA CONQUISTA',
                    style: text.labelSmall?.copyWith(color: ReadUpColors.gold700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    achievement.title,
                    style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: Spaces.xs),
                  Row(
                    children: [
                      Expanded(
                        child: ProgressBar(
                          value: achievement.fraction,
                          size: ProgressBarSize.thin,
                          color: ReadUpColors.gold600,
                          trackColor: ReadUpColors.gold200,
                        ),
                      ),
                      const SizedBox(width: Spaces.sm),
                      // quebra linha com fonte grande em vez de estourar
                      Flexible(
                        child: Text(
                          remaining,
                          style: text.bodySmall?.copyWith(
                            color: ReadUpColors.gold700,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
