import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/core.dart';

/// Cartão que vira em 3D (rotateY, 300 ms) para mostrar o verso; a face troca na metade do giro.
/// Com "reduzir movimento", troca por crossfade.
class FlipCard extends StatelessWidget {
  const FlipCard({super.key, required this.flipped, required this.front, required this.back});

  final bool flipped;
  final Widget front;
  final Widget back;

  @override
  Widget build(BuildContext context) {
    if (context.reduceMotion) {
      return AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: flipped ? back : front,
      );
    }
    return TweenAnimationBuilder<double>(
      tween: Tween(end: flipped ? 1 : 0),
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      builder: (context, t, _) {
        final showBack = t >= 0.5;
        // o verso gira mais meia volta para não aparecer espelhado
        final angle = math.pi * t + (showBack ? math.pi : 0);
        return Transform(
          alignment: Alignment.center,
          transform: Matrix4.identity()
            ..setEntry(3, 2, 0.0012) // perspectiva
            ..rotateY(angle),
          child: showBack ? back : front,
        );
      },
    );
  }
}
