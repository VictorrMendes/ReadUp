import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/core/services/reminders.dart';
import 'package:readup/features/profile/presentation/cubits/profile_cubit.dart';
import 'package:readup/shared/domain/constants/levels.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/harness.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockStatsRepository stats;
  late MockPreferencesRepository preferences;
  late MockReminders reminders;
  final summary = summaryWith();

  setUpAll(() => registerFallbackValue(EnglishLevel.a1));
  setUp(() {
    stats = MockStatsRepository();
    preferences = MockPreferencesRepository();
    reminders = quietReminders();
    when(() => stats.summary()).thenAnswer((_) async => summary);
    when(() => stats.daily()).thenAnswer((_) async => week);
    when(() => stats.achievements()).thenAnswer((_) async => const [achievementWords]);
  });

  ProfileCubit build() =>
      ProfileCubit(stats: stats, preferences: preferences, reminders: reminders);

  blocTest<ProfileCubit, ProfileState>(
    'carrega números, semana, conquistas e o lembrete atual',
    build: build,
    act: (cubit) => cubit.load(),
    expect: () => [
      ProfileState(summary: summary, week: week),
      ProfileState(
        summary: summary,
        week: week,
        achievements: const [achievementWords],
        reminder: ReminderTime.evening,
      ),
    ],
  );

  blocTest<ProfileCubit, ProfileState>(
    'conquistas falham: o resto aparece mesmo assim',
    setUp: () =>
        when(() => stats.achievements())
            .thenAnswer((_) async => throw const RequestFailure(message: 'x')),
    build: build,
    act: (cubit) => cubit.load(),
    verify: (cubit) {
      expect(cubit.state.summary, summary);
      expect(cubit.state.achievements, isNull);
    },
  );

  blocTest<ProfileCubit, ProfileState>(
    'números falham sem nada na tela: erro (as preferências seguem)',
    setUp: () =>
        when(() => stats.summary())
            .thenAnswer((_) async => throw const RequestFailure(message: 'x')),
    build: build,
    act: (cubit) => cubit.load(),
    expect: () => [const ProfileState(statsError: true, reminder: ReminderTime.evening)],
  );

  blocTest<ProfileCubit, ProfileState>(
    'meta salva: "Salvo"; falha: a mensagem',
    setUp: () {
      when(() => preferences.setGoal(500)).thenAnswer((_) async {});
      when(() => preferences.setLevel(any()))
          .thenAnswer((_) async => throw const RequestFailure(message: 'Sem conexão'));
    },
    build: build,
    act: (cubit) async {
      expect(await cubit.setGoal(500), isTrue);
      expect(await cubit.setLevel(EnglishLevel.c1), isFalse);
    },
    expect: () => [
      const ProfileState(saving: true),
      const ProfileState(saved: true),
      const ProfileState(saving: true),
      const ProfileState(error: 'Sem conexão'),
    ],
  );

  blocTest<ProfileCubit, ProfileState>(
    'permissão negada: fica sem lembrete e avisa',
    setUp: () => when(() => reminders.set(ReminderTime.morning)).thenAnswer((_) async => false),
    build: build,
    act: (cubit) => cubit.setReminder(ReminderTime.morning),
    expect: () => [const ProfileState(reminder: ReminderTime.off, reminderDenied: true)],
  );
}
