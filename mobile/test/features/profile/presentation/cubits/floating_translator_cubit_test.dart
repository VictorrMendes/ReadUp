import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/features/profile/presentation/cubits/floating_translator_cubit.dart';

import '../../../../fakes/mocks.dart';

void main() {
  late MockFloatingTranslator translator;

  setUp(() {
    translator = MockFloatingTranslator();
    when(translator.isRunning).thenAnswer((_) async => false);
    when(translator.hasPermission).thenAnswer((_) async => true);
    when(translator.start).thenAnswer((_) async => true);
    when(translator.stop).thenAnswer((_) async {});
    when(translator.openPermissionSettings).thenAnswer((_) async {});
  });

  FloatingTranslatorCubit build() => FloatingTranslatorCubit(translator: translator);

  blocTest<FloatingTranslatorCubit, FloatingTranslatorState>(
    'carrega o estado do serviço (a bolha pode estar ligada de antes)',
    setUp: () => when(translator.isRunning).thenAnswer((_) async => true),
    build: build,
    act: (cubit) => cubit.load(),
    expect: () => [const FloatingTranslatorState(on: true)],
  );

  blocTest<FloatingTranslatorCubit, FloatingTranslatorState>(
    'com permissão: liga',
    build: build,
    act: (cubit) => cubit.toggle(true),
    expect: () => [
      const FloatingTranslatorState(busy: true),
      const FloatingTranslatorState(on: true),
    ],
  );

  blocTest<FloatingTranslatorCubit, FloatingTranslatorState>(
    'desliga',
    build: build,
    seed: () => const FloatingTranslatorState(on: true),
    act: (cubit) => cubit.toggle(false),
    expect: () => [
      const FloatingTranslatorState(on: true, busy: true),
      const FloatingTranslatorState(),
    ],
    verify: (_) => verify(translator.stop).called(1),
  );

  blocTest<FloatingTranslatorCubit, FloatingTranslatorState>(
    'sem permissão: pede; abriu as configurações e voltou com ela: liga sozinho',
    setUp: () {
      var granted = false;
      when(translator.hasPermission).thenAnswer((_) async => granted);
      when(translator.openPermissionSettings).thenAnswer((_) async => granted = true);
    },
    build: build,
    act: (cubit) async {
      await cubit.toggle(true);
      await cubit.permissionAnswered(openSettings: true);
      await cubit.resumed();
    },
    expect: () => [
      const FloatingTranslatorState(askPermission: true),
      const FloatingTranslatorState(),
      const FloatingTranslatorState(busy: true),
      const FloatingTranslatorState(on: true),
    ],
  );

  blocTest<FloatingTranslatorCubit, FloatingTranslatorState>(
    'recusou o aviso: não abre nada e continua desligada',
    setUp: () => when(translator.hasPermission).thenAnswer((_) async => false),
    build: build,
    act: (cubit) async {
      await cubit.toggle(true);
      await cubit.permissionAnswered(openSettings: false);
    },
    expect: () => [
      const FloatingTranslatorState(askPermission: true),
      const FloatingTranslatorState(),
    ],
    verify: (_) {
      verifyNever(translator.openPermissionSettings);
      verifyNever(translator.start);
    },
  );

  blocTest<FloatingTranslatorCubit, FloatingTranslatorState>(
    'o sistema recusou ligar: avisa',
    setUp: () => when(translator.start).thenAnswer((_) async => false),
    build: build,
    act: (cubit) => cubit.toggle(true),
    expect: () => [
      const FloatingTranslatorState(busy: true),
      const FloatingTranslatorState(failed: true),
    ],
  );
}
