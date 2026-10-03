import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/motion.dart';
import '../../../design_system/readup_colors.dart';

/// Anel da meta: enche de [from] até [to] (0–1) desacelerando e chama [onFull] no instante em que
/// passa de 100% (não quando já começa cheio). Decorativo: quem usa descreve o valor.
class GoalRing extends StatefulWidget {
  const GoalRing({
    super.key,
    required this.from,
    required this.to,
    required this.color,
    this.size = 64,
    this.stroke = 8,
    this.delay = Duration.zero,
    this.skip = false,
    this.onFull,
    this.child,
  });

  final double from;
  final double to;
  final Color color;
  final double size;
  final double stroke;
  final Duration delay;

  /// pula direto para [to] (toque na tela de conclusão)
  final bool skip;
  final VoidCallback? onFull;
  final Widget? child;

  @override
  State<GoalRing> createState() => _GoalRingState();
}

class _GoalRingState extends State<GoalRing> with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(vsync: this, duration: Motion.ring);
  late Animation<double> _value = AlwaysStoppedAnimation(widget.from.clamp(0, 1));
  var _notified = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_controller.status == AnimationStatus.dismissed) _run();
  }

  @override
  void didUpdateWidget(GoalRing old) {
    super.didUpdateWidget(old);
    if (widget.skip && !old.skip) _controller.value = 1;
  }

  void _run() {
    final from = widget.from.clamp(0.0, 1.0);
    final to = widget.to.clamp(0.0, 1.0);
    _value = Tween(begin: from, end: to).animate(
      CurvedAnimation(parent: _controller, curve: MotionCurves.enter),
    )..addListener(_checkFull);
    if (widget.skip || context.reduceMotion) {
      _controller.value = 1;
    } else {
      Future<void>.delayed(widget.delay, () {
        if (mounted) _controller.forward();
      });
    }
  }

  void _checkFull() {
    if (_notified || widget.from >= 1 || _value.value < 1) return;
    _notified = true;
    // pulado ou "reduzir movimento": chega a 100% durante a montagem; quem usa reage com setState,
    // então o aviso vai para depois do quadro
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.onFull?.call();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox.square(
        key: const ValueKey('goal-ring'),
        dimension: widget.size,
        child: AnimatedBuilder(
          animation: _value,
          builder: (context, child) => CustomPaint(
            painter: _RingPainter(value: _value.value, color: widget.color, stroke: widget.stroke),
            child: child,
          ),
          child: Center(child: widget.child),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.value, required this.color, required this.stroke});

  final double value;
  final Color color;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final arc = rect.deflate(stroke / 2);
    final track = Paint()
      ..color = ReadUpColors.border
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    canvas.drawArc(arc, 0, 2 * math.pi, false, track);
    if (value <= 0) return;
    final fill = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    // o arco começa no topo
    canvas.drawArc(arc, -math.pi / 2, 2 * math.pi * value, false, fill);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.value != value || old.color != color;
}
