import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/services/reminders.dart';
import 'package:readup/features/auth/presentation/blocs/auth_bloc.dart';
import 'package:readup/features/profile/presentation/cubits/profile_cubit.dart';
import 'package:readup/features/profile/presentation/screens/profile_screen.dart';
import 'package:readup/shared/domain/models/achievement.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/harness.dart';
import '../../../../fakes/mocks.dart';

const _unlocked = Achievement(
  id: 'first-text',
  title: 'Primeiro texto',
  icon: 'book-outline',
  description: 'Conclua um texto',
  target: 1,
  current: 1,
  unlocked: true,
);

void main() {
  late MockStatsRepository stats;
  late MockReminders reminders;
  late MockAuthBloc auth;

  setUpAll(() => registerFallbackValue(const AuthStarted()));
  setUp(() {
    stats = MockStatsRepository();
    reminders = quietReminders();
    auth = MockAuthBloc();
    when(() => auth.state).thenReturn(const AuthAuthenticated(onboardedUser));
    when(() => stats.summary()).thenAnswer((_) async => summaryWith());
    when(() => stats.daily()).thenAnswer((_) async => week);
    when(() => stats.achievements()).thenAnswer((_) async => const [achievementWords, _unlocked]);
  });

  Future<void> pumpProfile(WidgetTester tester, {bool streakHidden = false}) async {
    tester.view.physicalSize = const Size(1080, 9000);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      wrapApp(
        BlocProvider(
          create: (context) => ProfileCubit(
            stats: stats,
            preferences: MockPreferencesRepository(),
            reminders: reminders,
          )..load(),
          child: const ProfileScreen(user: onboardedUser),
        ),
        stats: stats,
        reminders: reminders,
        authBloc: auth,
        streakHidden: streakHidden,
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('identidade, números, semana e conquistas', (tester) async {
    await pumpProfile(tester);

    expect(find.text('A'), findsOneWidget);
    expect(find.text('ana@example.com'), findsOneWidget);
    expect(find.text('dias de ofensiva'), findsOneWidget);
    expect(find.text('18.400'), findsOneWidget);
    expect(find.text('0 de 1'), findsOneWidget);
    expect(find.text('Últimos 7 dias'), findsOneWidget);
    expect(find.byKey(const ValueKey('goal-check')), findsNWidgets(2));
    expect(find.text('1 / 2'), findsOneWidget);
    expect(find.text('320 / 1.000'), findsOneWidget);
    expect(find.text('Desbloqueada'), findsOneWidget);
  });

  testWidgets('ofensiva escondida: some dos números e o switch desliga', (tester) async {
    await pumpProfile(tester, streakHidden: true);

    expect(find.text('dias de ofensiva'), findsNothing);
    expect(tester.widget<SwitchListTile>(find.byType(SwitchListTile)).value, isFalse);
  });

  testWidgets('lembrete negado no sistema: avisa como liberar', (tester) async {
    when(() => reminders.set(ReminderTime.morning)).thenAnswer((_) async => false);
    await pumpProfile(tester);

    await tester.tap(find.text('Manhã'));
    await tester.pumpAndSettle();

    expect(find.textContaining('bloqueadas no aparelho'), findsOneWidget);
  });

  testWidgets('sair cancela os lembretes e encerra a sessão', (tester) async {
    await pumpProfile(tester);

    await tester.tap(find.text('Sair'));
    await tester.pumpAndSettle();

    verify(reminders.cancelAll).called(1);
    verify(() => auth.add(const LogoutRequested())).called(1);
  });
}
