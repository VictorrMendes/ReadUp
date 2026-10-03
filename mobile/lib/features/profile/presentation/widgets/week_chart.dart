import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/stats.dart';

const _maxBar = 96.0;
const _emptyBar = 4.0; // dia sem leitura: traço mínimo, não some do eixo

/// Palavras lidas por dia, do mais antigo para hoje. Dia com meta cumprida: barra verde com um
/// check acima (não depende só da cor); os outros, índigo. As barras crescem ao aparecer.
class WeekChart extends StatelessWidget {
  const WeekChart({super.key, required this.days});

  final List<DailyStat> days;

  @override
  Widget build(BuildContext context) {
    final max = days.fold(0, (m, d) => d.wordsRead > m ? d.wordsRead : m);
    final total = days.fold(0, (sum, d) => sum + d.wordsRead);
    final goalDays = days.where((d) => d.goalMet).length;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Spaces.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
              header: true,
              label:
                  'Últimos ${days.length} dias: ${total.formatted} palavras no total; meta cumprida em ${goalDays.asDays}',
              excludeSemantics: true,
              child: Text('Últimos ${days.length} dias', style: context.textTheme.titleLarge),
            ),
            const SizedBox(height: Spaces.lg),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final day in days)
                  Expanded(
                    child: _Bar(
                      day: day,
                      height: day.wordsRead == 0
                          ? _emptyBar
                          : (day.wordsRead / max * _maxBar).clamp(_emptyBar, _maxBar),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.day, required this.height});

  final DailyStat day;
  final double height;

  @override
  Widget build(BuildContext context) {
    final date = calendarDay(day.day);
    final color = day.wordsRead == 0
        ? ReadUpColors.border
        : day.goalMet
        ? ReadUpColors.success600
        : ReadUpColors.primary500;
    return Semantics(
      container: true,
      label:
          '${date.weekdayName}, ${day.wordsRead.formatted} ${day.wordsRead == 1 ? 'palavra' : 'palavras'}'
          '${day.goalMet ? ', meta cumprida' : ''}',
      excludeSemantics: true,
      child: Column(
        children: [
          if (day.goalMet)
            const Icon(
              Icons.check_circle,
              size: 12,
              color: ReadUpColors.success600,
              key: ValueKey('goal-check'),
            ),
          const SizedBox(height: Spaces.xs),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: context.reduceMotion ? height : _emptyBar, end: height),
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOutCubic,
            builder: (context, h, _) => Container(
              height: h,
              width: 22,
              decoration: BoxDecoration(
                color: color,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
              ),
            ),
          ),
          const SizedBox(height: Spaces.xs),
          Text(
            date.weekdayName[0],
            style: context.textTheme.bodySmall?.copyWith(color: ReadUpColors.textSecondary),
          ),
        ],
      ),
    );
  }
}
