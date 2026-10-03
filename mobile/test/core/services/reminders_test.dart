import 'package:flutter_test/flutter_test.dart';
import 'package:readup/core/services/reminders.dart';

void main() {
  final morning = DateTime(2026, 10, 3, 7);
  final night = DateTime(2026, 10, 3, 21);

  group('reminderDates', () {
    test('hoje no horário escolhido e os próximos dias', () {
      final dates = reminderDates(ReminderTime.evening, morning, doneToday: false);
      expect(dates, hasLength(reminderDaysAhead));
      expect(dates.first, DateTime(2026, 10, 3, 20));
      expect(dates.last, DateTime(2026, 10, 9, 20));
    });

    test('dia já garantido ou horário passado: começa amanhã', () {
      expect(
        reminderDates(ReminderTime.evening, morning, doneToday: true).first,
        DateTime(2026, 10, 4, 20),
      );
      expect(
        reminderDates(ReminderTime.evening, night, doneToday: false).first,
        DateTime(2026, 10, 4, 20),
      );
    });

    test('virada de mês', () {
      final dates = reminderDates(
        ReminderTime.morning,
        DateTime(2026, 10, 30, 9),
        doneToday: false,
      );
      expect(dates.first, DateTime(2026, 10, 31, 8));
      expect(dates[1], DateTime(2026, 11, 1, 8));
    });

    test('sem lembrete: nada agendado', () {
      expect(reminderDates(ReminderTime.off, morning, doneToday: false), isEmpty);
    });
  });

  group('reminderMessage', () {
    final days = [for (var i = 0; i < 8; i++) DateTime(2026, 10, 3 + i, 20)];

    test('varia de um dia para o outro', () {
      final titles = {for (final d in days) reminderMessage(d, streak: 0).title};
      expect(titles.length, greaterThan(1));
    });

    test('a ofensiva só aparece quando está em jogo (e visível)', () {
      expect(
        days.map((d) => reminderMessage(d, streak: 0).title),
        everyElement(isNot(contains('ofensiva'))),
      );
      expect(
        days.map((d) => reminderMessage(d, streak: 1).title),
        contains(contains('ofensiva de 1 dia')),
      );
    });
  });
}
