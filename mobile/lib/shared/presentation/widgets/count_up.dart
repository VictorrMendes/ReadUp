import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/motion.dart';

/// Número que conta de 0 até [value] (pt-BR, ease-out). O leitor de tela lê o valor final, não os
/// passos. [skip] ou "reduzir movimento": já mostra o final.
class CountUp extends StatelessWidget {
  const CountUp({
    super.key,
    required this.value,
    this.prefix = '',
    this.delay = Duration.zero,
    this.skip = false,
    this.style,
  });

  final int value;
  final String prefix;
  final Duration delay;
  final bool skip;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final finalText = '$prefix${value.formatted}';
    if (skip || context.reduceMotion) return Text(finalText, style: style);
    final total = delay + Motion.count;
    return Semantics(
      label: finalText,
      excludeSemantics: true,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: value.toDouble()),
        duration: total,
        curve: Interval(delay.inMilliseconds / total.inMilliseconds, 1, curve: Curves.easeOutCubic),
        builder: (context, v, _) => Text('$prefix${v.round().formatted}', style: style),
      ),
    );
  }
}
