import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/achievement.dart';

/// Medalha compacta. O estado não depende só da cor: bloqueada mostra cadeado e progresso;
/// desbloqueada, check e "Desbloqueada" em dourado (recompensa).
class AchievementBadge extends StatelessWidget {
  const AchievementBadge({super.key, required this.achievement});

  final Achievement achievement;

  @override
  Widget build(BuildContext context) {
    final a = achievement;
    final text = context.textTheme;
    final unit = a.unitFor(a.target);
    final color = a.unlocked ? ReadUpColors.gold700 : ReadUpColors.textSecondary;
    return Semantics(
      container: true,
      label: a.unlocked
          ? '${a.title}, desbloqueada'
          : '${a.title}, bloqueada, ${a.current.formatted} de ${a.target.formatted} $unit',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.all(Spaces.md),
        decoration: BoxDecoration(
          color: a.unlocked ? ReadUpColors.gold50 : ReadUpColors.background,
          borderRadius: BorderRadius.circular(Radii.lg),
          border: Border.all(color: a.unlocked ? ReadUpColors.gold200 : ReadUpColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: a.unlocked ? ReadUpColors.gold100 : ReadUpColors.surfaceMuted,
                border: Border.all(
                  color: a.unlocked ? ReadUpColors.gold600 : ReadUpColors.border,
                  width: 2,
                ),
              ),
              child: Icon(a.iconData, size: 20, color: color),
            ),
            const SizedBox(height: Spaces.sm),
            Text(a.title, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: Spaces.xs),
            Row(
              children: [
                Icon(a.unlocked ? Icons.check_circle : Icons.lock, size: 12, color: color),
                const SizedBox(width: Spaces.xs),
                Flexible(
                  child: Text(
                    a.unlocked ? 'Desbloqueada' : '${a.current.formatted} / ${a.target.formatted}',
                    style: text.bodySmall?.copyWith(color: color),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
