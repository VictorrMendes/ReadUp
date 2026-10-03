import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/core/services/reminders.dart';
import 'package:readup/features/onboarding/presentation/cubits/onboarding_cubit.dart';
import 'package:readup/shared/domain/constants/levels.dart';

import '../../../../fakes/harness.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockPreferencesRepository repository;
  late MockReminders reminders;

  setUpAll(() {
    registerFallbackValue(EnglishLevel.a1);
    registerFallbackValue(ReminderTime.off);
  });
  setUp(() {
    repository = MockPreferencesRepository();
    reminders = quietReminders();
  });

  OnboardingCubit build() => OnboardingCubit(repository: repository, reminders: reminders);

  test('sem nível e meta não dá para começar', () {
    final cubit = build();
    expect(cubit.state.canStart, isFalse);
    cubit
      ..levelSelected(EnglishLevel.b1)
      ..goalSelected(500);
    expect(cubit.state.canStart, isTrue);
  });

  blocTest<OnboardingCubit, OnboardingState>(
    'começar salva nível e meta e termina',
    setUp: () {
      when(() => repository.setLevel(any())).thenAnswer((_) async {});
      when(() => repository.setGoal(any())).thenAnswer((_) async {});
    },
    build: build,
    seed: () => const OnboardingState(level: EnglishLevel.b1, goal: 500),
    act: (cubit) => cubit.startRequested(),
    expect: () => [
      const OnboardingState(level: EnglishLevel.b1, goal: 500, saving: true),
      const OnboardingState(level: EnglishLevel.b1, goal: 500, done: true),
    ],
    verify: (_) {
      verify(() => repository.setLevel(EnglishLevel.b1)).called(1);
      verify(() => repository.setGoal(500)).called(1);
      verify(() => reminders.set(ReminderTime.evening)).called(1);
    },
  );

  blocTest<OnboardingCubit, OnboardingState>(
    'falha ao salvar mostra a mensagem e deixa tentar de novo',
    setUp: () =>
        when(() => repository.setLevel(any()))
            .thenThrow(const RequestFailure(message: 'Sem conexão')),
    build: build,
    seed: () => const OnboardingState(level: EnglishLevel.b1, goal: 500),
    act: (cubit) => cubit.startRequested(),
    expect: () => [
      const OnboardingState(level: EnglishLevel.b1, goal: 500, saving: true),
      const OnboardingState(level: EnglishLevel.b1, goal: 500, error: 'Sem conexão'),
    ],
  );
}
