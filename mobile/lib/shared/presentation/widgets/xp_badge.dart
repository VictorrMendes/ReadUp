import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/readup_colors.dart';

/// XP total ou, com [gain], o ganho ("+N XP"). Dourado = recompensa (o laranja é só da ofensiva).
/// [onHero]: pílula branca sobre o topo índigo do Início.
class XpBadge extends StatelessWidget {
  const XpBadge({super.key, required this.xp, this.gain = false, this.onHero = false});

  final int xp;
  final bool gain;
  final bool onHero;

  @override
  Widget build(BuildContext context) {
    final amount = xp.formatted;
    return Semantics(
      container: true,
      label: '${gain ? 'Mais ' : ''}$amount pontos de experiência',
      excludeSemantics: true,
      child: Container(
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: onHero ? ReadUpColors.surface : ReadUpColors.gold100,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.bolt, size: 16, color: ReadUpColors.gold600),
            const SizedBox(width: 4),
            Text(
              '${gain ? '+' : ''}$amount XP',
              style: context.textTheme.bodyMedium?.copyWith(
                color: ReadUpColors.gold700,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
