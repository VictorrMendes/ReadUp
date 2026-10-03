import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/motion.dart';
import '../../../design_system/readup_colors.dart';

enum ProgressBarSize {
  thin(4),
  regular(8),
  large(12);

  const ProgressBarSize(this.height);
  final double height;
}

/// Barra de progresso que enche desacelerando até o valor novo (instantânea com "reduzir
/// movimento"). [value] de 0 a 1.
class ProgressBar extends StatelessWidget {
  const ProgressBar({
    super.key,
    required this.value,
    this.color = ReadUpColors.primary500,
    this.trackColor = ReadUpColors.border,
    this.size = ProgressBarSize.regular,
    this.semanticLabel,
  });

  final double value;
  final Color color;
  final Color trackColor;
  final ProgressBarSize size;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final fraction = value.clamp(0.0, 1.0);
    final radius = BorderRadius.circular(size.height / 2);
    return Semantics(
      container: true,
      label: semanticLabel,
      value: '${(fraction * 100).round()}%',
      child: ClipRRect(
        borderRadius: radius,
        // ocupa a largura disponível (no título do AppBar a largura é livre e ela sumiria)
        child: SizedBox(
          width: double.infinity,
          height: size.height,
          child: ColoredBox(
            color: trackColor,
            child: TweenAnimationBuilder<double>(
              tween: Tween(end: fraction),
              duration: context.reduceMotion ? Duration.zero : Motion.progress,
              curve: MotionCurves.enter,
              builder: (context, animated, _) => FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: animated,
                child: DecoratedBox(
                  decoration: BoxDecoration(color: color, borderRadius: radius),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
