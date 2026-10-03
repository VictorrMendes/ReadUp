import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/readup_colors.dart';
import '../../../design_system/spaces.dart';

/// Etiqueta compacta (nível, categoria). [highlighted] = índigo, para o nível.
class LevelBadge extends StatelessWidget {
  const LevelBadge({super.key, required this.label, this.highlighted = false});

  final String label;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: highlighted ? ReadUpColors.primary100 : ReadUpColors.surfaceMuted,
        borderRadius: BorderRadius.circular(Radii.sm),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: Spaces.sm, vertical: 2),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: context.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: highlighted ? ReadUpColors.primary700 : ReadUpColors.textPrimary,
          ),
        ),
      ),
    );
  }
}
