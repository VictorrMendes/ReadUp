import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/stats.dart';

enum DayState { met, kept, pending, missed }

DayState dayStateOf(DailyStat day, {required bool isToday}) {
  if (day.goalMet) return DayState.met;
  if (day.streakKept) return DayState.kept;
  return isToday ? DayState.pending : DayState.missed;
}

/// Os 7 dias até hoje (o último é hoje). Laranja = dia com leitura (ofensiva); verde = meta
/// batida também. Estado nunca só pela cor: dia mantido tem check, hoje pendente é tracejado,
/// dia sem leitura é vazio. Para o leitor de tela, um resumo só.
class WeekStrip extends StatelessWidget {
  const WeekStrip({super.key, required this.days});

  final List<DailyStat> days;

  @override
  Widget build(BuildContext context) {
    final today = days.last;
    final kept = days.where((d) => d.streakKept).length;
    final met = days.where((d) => d.goalMet).length;
    return Semantics(
      container: true,
      label:
          'Últimos ${days.length} dias: leu em $kept, meta batida em $met; '
          'hoje ${today.streakKept ? 'mantida' : 'pendente'}',
      excludeSemantics: true,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          for (final (i, day) in days.indexed)
            _Day(
              day: day,
              state: dayStateOf(day, isToday: i == days.length - 1),
              isToday: i == days.length - 1,
            ),
        ],
      ),
    );
  }
}

class _Day extends StatelessWidget {
  const _Day({required this.day, required this.state, required this.isToday});

  final DailyStat day;
  final DayState state;
  final bool isToday;

  @override
  Widget build(BuildContext context) {
    // dia do calendário em UTC: converter para o fuso local trocaria o dia (UTC-3 → véspera)
    final letter = calendarDay(day.day).weekdayName[0];
    final filled = state == DayState.met || state == DayState.kept;
    return Column(
      children: [
        Text(
          letter,
          // cinza sobre streak50 daria 4.48:1: letras em textPrimary
          style: context.textTheme.bodySmall?.copyWith(
            color: isToday ? ReadUpColors.primary600 : ReadUpColors.textPrimary,
            fontWeight: isToday ? FontWeight.w700 : null,
          ),
        ),
        const SizedBox(height: Spaces.xs),
        Container(
          key: ValueKey('day-${state.name}'),
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: switch (state) {
              DayState.met => ReadUpColors.success600,
              // streak700: check branco 5.2:1 (o laranja puro daria 2.8:1)
              DayState.kept => ReadUpColors.streak700,
              DayState.pending => ReadUpColors.surface,
              DayState.missed => ReadUpColors.surfaceMuted,
            },
            border: switch (state) {
              DayState.pending => Border.all(color: ReadUpColors.primary500, width: 2),
              DayState.missed => Border.all(color: ReadUpColors.border),
              _ => null,
            },
          ),
          child: filled ? const Icon(Icons.check, size: 18, color: Colors.white) : null,
        ),
      ],
    );
  }
}
