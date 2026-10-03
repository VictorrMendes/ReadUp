import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../design_system/motion.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/achievement.dart';
import '../../../../shared/domain/models/stats.dart';
import '../../../../shared/presentation/cubits/streak_visibility_cubit.dart';
import '../../../../shared/presentation/widgets/count_up.dart';
import '../../../../shared/presentation/widgets/goal_ring.dart';
import '../../domain/completion_texts.dart';
import '../../domain/models/progress_result.dart';
import '../widgets/confetti.dart';

/// O que a pessoa escolheu no fim (a tela do leitor navega).
enum CompletionAction { primary, secondary, finishForToday, close }

/// Tela cheia de conclusão: o pico da leitura (pico-fim). Sequência curta em cascata; tocar em
/// qualquer lugar pula para o fim; com "reduzir movimento", tudo já aparece no valor final.
class CompletionScreen extends StatefulWidget {
  const CompletionScreen({
    super.key,
    required this.articleTitle,
    required this.minutes,
    required this.gains,
    required this.goal,
    required this.longestStreak,
    required this.primaryLabel,
    required this.secondaryLabel,
    this.pick,
  });

  final String articleTitle;
  final int minutes;
  final SessionGains gains;

  /// meta depois da conclusão (null se falhou)
  final GoalStatus? goal;
  final int? longestStreak;

  /// "Próximo texto" / "Próximo capítulo" (null: último capítulo)
  final String? primaryLabel;
  final String secondaryLabel;

  /// sorteio da frase do título (fixo nos testes)
  final double? pick;

  @override
  State<CompletionScreen> createState() => _CompletionScreenState();
}

class _CompletionScreenState extends State<CompletionScreen> {
  late final double _pick = widget.pick ?? math.Random().nextDouble();
  var _skipped = false;
  var _ringFull = false;
  var _finished = false;

  double get _target => (widget.goal?.target ?? 0).toDouble();
  double get _end => _target == 0 ? 0 : (widget.goal!.wordsToday / _target).clamp(0, 1);
  double get _start =>
      _target == 0 ? 0 : ((widget.goal!.wordsToday - widget.gains.words) / _target).clamp(0, 1);
  bool get _alreadyMet => _start >= 1;
  bool get _willCross => _target > 0 && !_alreadyMet && _end >= 1;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _announce());
  }

  void _announce() {
    if (!mounted) return;
    final gains = widget.gains;
    final streakShown = context.read<StreakVisibilityCubit>().state == false && gains.streakUp;
    final parts = [
      'Leitura concluída',
      if (gains.xp > 0) 'Mais ${gains.xp.formatted} pontos de experiência',
      if (gains.words > 0) '${gains.words.formatted} palavras',
      if (gains.goalMet) 'Meta de hoje cumprida',
      if (streakShown) 'Ofensiva: ${gains.streak.asDays}',
      if (gains.achievements.isNotEmpty)
        'Conquista: ${gains.achievements.map((a) => a.title).join(', ')}',
    ];
    unawaited(
      SemanticsService.sendAnnouncement(View.of(context), parts.join('. '), TextDirection.ltr),
    );
  }

  void _onRingFull() {
    setState(() => _ringFull = true);
    // confete e háptica no mesmo instante (harmonia visual + tátil)
    unawaited(Haptics.success());
  }

  void _close(CompletionAction action) => Navigator.of(context).pop(action);

  @override
  Widget build(BuildContext context) {
    if (_finished) {
      return _UntilTomorrow(
        streak: widget.gains.streak,
        onDone: () => _close(CompletionAction.finishForToday),
      );
    }
    final text = context.textTheme;
    final reduce = context.reduceMotion;
    final skip = _skipped || reduce;
    final gains = widget.gains;
    final streakHidden = context.watch<StreakVisibilityCubit>().state != false;
    final streakUp = gains.streakUp && !streakHidden;
    final crossed = _alreadyMet || (_willCross && (_ringFull || skip));
    final milestone = streakUp ? milestoneNote(gains.streak) : null;
    final shown = gains.achievements.take(2).toList();
    final more = gains.achievements.length - shown.length;
    final goal = widget.goal;

    final steps = <Widget>[
      Image.asset('assets/images/celebrate.png', height: 150, excludeFromSemantics: true),
      Column(
        children: [
          Semantics(
            header: true,
            child: Text(
              completionTitle(streak: gains.streak, streakUp: streakUp, pick: _pick),
              textAlign: TextAlign.center,
              style: text.headlineLarge,
            ),
          ),
          const SizedBox(height: Spaces.xs),
          Text(
            widget.articleTitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary),
          ),
        ],
      ),
      Row(
        children: [
          Expanded(
            child: _Tile(
              icon: Icons.bolt,
              iconColor: ReadUpColors.gold600,
              background: ReadUpColors.gold50,
              border: ReadUpColors.gold100,
              label: 'XP',
              labelColor: ReadUpColors.gold700,
              value: CountUp(
                value: gains.xp,
                prefix: '+',
                skip: skip,
                delay: const Duration(milliseconds: 300),
                style: context.readupText.stat.copyWith(color: ReadUpColors.gold700),
              ),
            ),
          ),
          const SizedBox(width: Spaces.sm),
          Expanded(
            child: _Tile(
              icon: Icons.menu_book,
              iconColor: ReadUpColors.primary600,
              background: ReadUpColors.primary50,
              border: ReadUpColors.primary200,
              label: 'palavras',
              labelColor: ReadUpColors.primary700,
              value: CountUp(
                value: gains.words,
                skip: skip,
                delay: const Duration(milliseconds: 360),
                style: context.readupText.stat.copyWith(color: ReadUpColors.primary700),
              ),
            ),
          ),
          const SizedBox(width: Spaces.sm),
          Expanded(
            child: _Tile(
              icon: Icons.schedule,
              iconColor: ReadUpColors.textSecondary,
              background: ReadUpColors.surface,
              border: ReadUpColors.border,
              label: 'de leitura',
              labelColor: ReadUpColors.textSecondary,
              value: Text('${widget.minutes} min', style: context.readupText.stat),
            ),
          ),
        ],
      ),
      if (goal != null && goal.target != null)
        _GoalCard(
          goal: goal,
          from: _start,
          to: _end,
          crossed: crossed,
          skip: skip,
          onFull: _willCross ? _onRingFull : null,
        ),
      if (streakUp)
        _StreakUpCard(
          streak: gains.streak,
          longest: widget.longestStreak,
          milestone: milestone,
          skip: skip,
        ),
      for (final a in shown) _AchievementCard(achievement: a),
      if (more > 0)
        Text(
          '+$more ${more == 1 ? 'conquista' : 'conquistas'}',
          textAlign: TextAlign.center,
          style: text.bodyMedium?.copyWith(
            color: ReadUpColors.gold700,
            fontWeight: FontWeight.w600,
          ),
        ),
    ];

    return Scaffold(
      body: Listener(
        // tocar em qualquer lugar pula a sequência (sem bloquear os botões)
        onPointerDown: (_) {
          if (!_skipped) setState(() => _skipped = true);
        },
        child: Stack(
          children: [
            SafeArea(
              child: Column(
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: IconButton(
                      tooltip: 'Fechar',
                      icon: const Icon(Icons.close),
                      onPressed: () => _close(CompletionAction.close),
                    ),
                  ),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(Spaces.xl, 0, Spaces.xl, Spaces.xl),
                      children: [
                        for (final (i, step) in steps.indexed) ...[
                          if (i > 0) const SizedBox(height: Spaces.md),
                          _Step(index: i, skip: skip, child: step),
                        ],
                      ],
                    ),
                  ),
                  _Footer(
                    primaryLabel: widget.primaryLabel,
                    secondaryLabel: widget.secondaryLabel,
                    showFinishForToday: goal?.completed ?? false,
                    onAction: (action) {
                      if (action == CompletionAction.finishForToday) {
                        setState(() => _finished = true);
                      } else {
                        _close(action);
                      }
                    },
                  ),
                ],
              ),
            ),
            if (_willCross && _ringFull && !reduce) const Positioned.fill(child: Confetti()),
          ],
        ),
      ),
    );
  }
}

/// Um passo da sequência: sobe e aparece com atraso crescente; pulado, chega pronto.
class _Step extends StatelessWidget {
  const _Step({required this.index, required this.skip, required this.child});

  final int index;
  final bool skip;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (skip) return child;
    final delay = Duration(milliseconds: 110 * index);
    final total = delay + Motion.enter;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: total,
      curve: Interval(delay.inMilliseconds / total.inMilliseconds, 1, curve: MotionCurves.enter),
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(offset: Offset(0, 12 * (1 - t)), child: child),
      ),
      child: child,
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.iconColor,
    required this.background,
    required this.border,
    required this.label,
    required this.labelColor,
    required this.value,
  });

  final IconData icon;
  final Color iconColor;
  final Color background;
  final Color border;
  final String label;
  final Color labelColor;
  final Widget value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Spaces.md),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: iconColor),
          const SizedBox(height: Spaces.xs),
          FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: value),
          Text(label, style: context.textTheme.bodySmall?.copyWith(color: labelColor)),
        ],
      ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  const _GoalCard({
    required this.goal,
    required this.from,
    required this.to,
    required this.crossed,
    required this.skip,
    required this.onFull,
  });

  final GoalStatus goal;
  final double from;
  final double to;
  final bool crossed;
  final bool skip;
  final VoidCallback? onFull;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final target = goal.target!;
    return Semantics(
      container: true,
      label: goal.completed
          ? 'Meta de hoje cumprida: ${goal.wordsToday.formatted} de ${target.formatted} palavras'
          : 'Faltam ${goal.remaining.formatted} palavras para a meta de hoje',
      excludeSemantics: true,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.all(Spaces.lg),
        decoration: BoxDecoration(
          color: crossed ? ReadUpColors.success100 : ReadUpColors.surface,
          borderRadius: BorderRadius.circular(Radii.lg),
          border: Border.all(color: crossed ? ReadUpColors.success500 : ReadUpColors.border),
        ),
        child: Row(
          children: [
            GoalRing(
              from: from,
              to: to,
              skip: skip,
              delay: const Duration(milliseconds: 500),
              color: crossed ? ReadUpColors.success500 : ReadUpColors.primary500,
              onFull: onFull,
              child: crossed
                  ? const Icon(Icons.check, size: 26, color: ReadUpColors.success600)
                  : Text(
                      '${(to * 100).round()}%',
                      style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
            ),
            const SizedBox(width: Spaces.lg),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    crossed
                        ? 'Meta de hoje cumprida'
                        : 'Faltam ${goal.remaining.formatted} palavras',
                    style: text.titleMedium,
                  ),
                  Text(
                    '${goal.wordsToday.formatted} / ${target.formatted}',
                    style: text.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: crossed ? ReadUpColors.success700 : ReadUpColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Ofensiva +1: a chama cresce com antecipação e o número rola do antigo para o novo.
class _StreakUpCard extends StatelessWidget {
  const _StreakUpCard({
    required this.streak,
    required this.longest,
    required this.milestone,
    required this.skip,
  });

  final int streak;
  final int? longest;
  final String? milestone;
  final bool skip;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final note = streakNote(streak, longest);
    return Semantics(
      container: true,
      label: ['${streak.asDays} de ofensiva', note, ?milestone].join('. '),
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.all(Spaces.lg),
        decoration: BoxDecoration(
          color: ReadUpColors.streak50,
          borderRadius: BorderRadius.circular(Radii.lg),
          border: Border.all(color: ReadUpColors.streak100),
        ),
        child: Row(
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: skip ? 1 : 0, end: 1),
              duration: const Duration(milliseconds: 900),
              curve: const Interval(0.4, 1),
              builder: (context, t, child) {
                // antecipação: encolhe, cresce e assenta
                final scale = t < 0.3
                    ? 1 - 0.1 * (t / 0.3)
                    : t < 0.7
                    ? 0.9 + 0.28 * ((t - 0.3) / 0.4)
                    : 1.18 - 0.18 * ((t - 0.7) / 0.3);
                return Transform.scale(scale: scale, child: child);
              },
              child: Image.asset('assets/images/streak.png', width: 40, height: 40),
            ),
            const SizedBox(width: Spaces.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: skip ? 1 : 0, end: 1),
                    duration: const Duration(milliseconds: 900),
                    curve: const Interval(0.5, 1, curve: Curves.easeOutBack),
                    builder: (context, t, _) => ClipRect(
                      child: SizedBox(
                        height: 26,
                        child: Stack(
                          children: [
                            // o número antigo sobe e sai; o novo entra de baixo
                            Transform.translate(
                              offset: Offset(0, -16 * t),
                              child: Opacity(
                                opacity: (1 - t).clamp(0, 1),
                                child: Text(
                                  '${(streak - 1).clamp(0, streak).asDays} de ofensiva',
                                  style: text.titleLarge,
                                ),
                              ),
                            ),
                            Transform.translate(
                              offset: Offset(0, 16 * (1 - t)),
                              child: Opacity(
                                opacity: t.clamp(0, 1),
                                child: Text('${streak.asDays} de ofensiva', style: text.titleLarge),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Text(note, style: text.bodyMedium?.copyWith(color: ReadUpColors.streak700)),
                  if (milestone case final line?)
                    Text(line, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AchievementCard extends StatelessWidget {
  const _AchievementCard({required this.achievement});

  final AchievementRef achievement;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final icon = Achievement(
      id: achievement.id,
      title: achievement.title,
      icon: achievement.icon,
      description: '',
      target: 1,
      current: 1,
      unlocked: true,
    ).iconData;
    return Semantics(
      container: true,
      label: 'Conquista desbloqueada: ${achievement.title}',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.all(Spaces.lg),
        decoration: BoxDecoration(
          color: ReadUpColors.gold50,
          borderRadius: BorderRadius.circular(Radii.lg),
          border: Border.all(color: ReadUpColors.gold200),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: ReadUpColors.gold100,
                border: Border.all(color: ReadUpColors.gold600, width: 2),
              ),
              child: Icon(icon, color: ReadUpColors.gold700),
            ),
            const SizedBox(width: Spaces.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CONQUISTA DESBLOQUEADA',
                    style: text.labelSmall?.copyWith(color: ReadUpColors.gold700),
                  ),
                  Text(achievement.title, style: text.titleLarge),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({
    required this.primaryLabel,
    required this.secondaryLabel,
    required this.showFinishForToday,
    required this.onAction,
  });

  final String? primaryLabel;
  final String secondaryLabel;
  final bool showFinishForToday;
  final ValueChanged<CompletionAction> onAction;

  @override
  Widget build(BuildContext context) {
    const tall = Size.fromHeight(52);
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: ReadUpColors.surface,
        border: Border(top: BorderSide(color: ReadUpColors.border)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Spaces.xl, Spaces.md, Spaces.xl, Spaces.md),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (primaryLabel case final label?) ...[
              FilledButton(
                onPressed: () => onAction(CompletionAction.primary),
                style: FilledButton.styleFrom(minimumSize: tall),
                child: Text(label),
              ),
              TextButton(
                onPressed: () => onAction(CompletionAction.secondary),
                child: Text(secondaryLabel),
              ),
            ] else
              FilledButton(
                onPressed: () => onAction(CompletionAction.secondary),
                style: FilledButton.styleFrom(minimumSize: tall),
                child: Text(secondaryLabel),
              ),
            if (showFinishForToday)
              TextButton(
                onPressed: () => onAction(CompletionAction.finishForToday),
                child: const Text('Terminar por hoje'),
              ),
          ],
        ),
      ),
    );
  }
}

/// Fim positivo do dia (pico-fim): sem "mais um", só o descanso merecido.
class _UntilTomorrow extends StatelessWidget {
  const _UntilTomorrow({required this.streak, required this.onDone});

  final int streak;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final hidden = context.watch<StreakVisibilityCubit>().state != false;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Spaces.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Image.asset('assets/images/mascot.png', height: 150, excludeFromSemantics: true),
              const SizedBox(height: Spaces.lg),
              Semantics(
                header: true,
                child: Text('Até amanhã!', textAlign: TextAlign.center, style: text.headlineLarge),
              ),
              const SizedBox(height: Spaces.sm),
              Text(
                hidden
                    ? 'Meta cumprida. Descansar também faz parte.'
                    : 'Meta cumprida e ofensiva de ${streak.asDays} garantida. Descansar também faz parte.',
                textAlign: TextAlign.center,
                style: text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary),
              ),
              const SizedBox(height: Spaces.xl),
              FilledButton(
                onPressed: onDone,
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                child: const Text('Voltar ao início'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
