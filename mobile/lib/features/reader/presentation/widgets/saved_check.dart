import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';

/// Check de "palavra salva": com [animate] (salva agora), entra com um salto de mola.
class SavedCheck extends StatelessWidget {
  const SavedCheck({super.key, required this.animate});

  final bool animate;

  @override
  Widget build(BuildContext context) {
    const icon = Icon(Icons.check_circle, color: ReadUpColors.success600);
    if (!animate || context.reduceMotion) return icon;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 420),
      curve: Curves.elasticOut,
      builder: (context, t, child) => Transform.scale(scale: t, child: child),
      child: icon,
    );
  }
}
