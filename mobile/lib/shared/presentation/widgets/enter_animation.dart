import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/motion.dart';

/// Entrada em cascata: sobe 12 px e aparece, com 45 ms entre itens (os primeiros 6). Roda uma
/// vez, ao montar; com "reduzir movimento" o conteúdo já chega pronto.
class EnterAnimation extends StatelessWidget {
  const EnterAnimation({super.key, required this.index, required this.child});

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (context.reduceMotion) return child;
    final delay = Motion.stagger * index.clamp(0, Motion.staggerMax);
    final total = delay + Motion.enter;
    final start = delay.inMilliseconds / total.inMilliseconds;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: total,
      curve: Interval(start, 1, curve: MotionCurves.enter),
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(offset: Offset(0, 12 * (1 - t)), child: child),
      ),
      child: child,
    );
  }
}
