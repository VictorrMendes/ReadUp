import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/motion.dart';
import '../../../../design_system/readup_colors.dart';

// marca, recompensa, ofensiva e meta (papéis do design system)
const _palette = [
  ReadUpColors.primary500,
  ReadUpColors.gold600,
  ReadUpColors.streak,
  ReadUpColors.success500,
  ReadUpColors.primary200,
];
const _count = 36; // poucas peças: leve em Android de entrada (plan.txt §6)
const _gravity = 1100.0;

class _Piece {
  _Piece(math.Random random, double width)
    : vx = (random.nextDouble() - 0.5) * width * 0.9,
      vy = -(500 + random.nextDouble() * 300),
      spin = (random.nextDouble() - 0.5) * 6 * math.pi,
      delay = random.nextDouble() * 0.08,
      color = _palette[random.nextInt(_palette.length)],
      size = 6 + random.nextDouble() * 6;

  final double vx;
  final double vy;
  final double spin;
  final double delay; // fração da duração
  final Color color;
  final double size;
}

/// Confete leve para evento raro (a meta do dia batida): sobe do centro e cai, some em ~1,5 s.
/// Não recebe toques. Com "reduzir movimento" não aparece (a cor e a háptica já celebram).
class Confetti extends StatefulWidget {
  const Confetti({super.key, this.seed});

  /// semente fixa para testes
  final int? seed;

  @override
  State<Confetti> createState() => _ConfettiState();
}

class _ConfettiState extends State<Confetti> with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(vsync: this, duration: Motion.celebrate)..forward();
  List<_Piece>? _pieces;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (context.reduceMotion) return const SizedBox.shrink();
    final width = MediaQuery.sizeOf(context).width;
    final random = math.Random(widget.seed);
    final pieces = _pieces ??= List.generate(_count, (_) => _Piece(random, width));
    return IgnorePointer(
      child: ExcludeSemantics(
        child: CustomPaint(
          key: const ValueKey('confetti'),
          size: Size.infinite,
          painter: _ConfettiPainter(_controller, pieces),
        ),
      ),
    );
  }
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter(this.progress, this.pieces) : super(repaint: progress);

  final Animation<double> progress;
  final List<_Piece> pieces;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final paint = Paint();
    for (final p in pieces) {
      final t = ((progress.value - p.delay) / (1 - p.delay)).clamp(0.0, 1.0);
      if (t == 0) continue;
      final opacity = t < 0.75 ? 1.0 : 1 - (t - 0.75) / 0.25;
      paint.color = p.color.withValues(alpha: opacity);
      canvas
        ..save()
        ..translate(center.dx + p.vx * t, center.dy + p.vy * t + _gravity * t * t)
        ..rotate(p.spin * t)
        ..drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromCenter(center: Offset.zero, width: p.size, height: p.size * 1.6),
            const Radius.circular(2),
          ),
          paint,
        )
        ..restore();
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => false;
}
