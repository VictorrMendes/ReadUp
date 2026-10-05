import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/features/profile/presentation/widgets/floating_translator_tile.dart';

import '../../../../fakes/harness.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockFloatingTranslator translator;

  setUp(() {
    translator = MockFloatingTranslator();
    when(() => translator.supported).thenReturn(true);
    when(translator.isRunning).thenAnswer((_) async => false);
    when(translator.hasPermission).thenAnswer((_) async => false);
    when(translator.start).thenAnswer((_) async => true);
    when(translator.openPermissionSettings).thenAnswer((_) async {});
  });

  Future<void> pump(WidgetTester tester, MockFloatingTranslator translator) async {
    await tester.pumpWidget(
      wrapApp(const Scaffold(body: FloatingTranslatorTile()), floatingTranslator: translator),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('onde não existe (iOS), a opção não aparece', (tester) async {
    await pump(tester, unsupportedFloating());
    expect(find.text('Tradução flutuante'), findsNothing);
  });

  testWidgets('sem permissão: explica e abre as configurações do sistema', (tester) async {
    await pump(tester, translator);
    expect(find.text('Tradução flutuante'), findsOneWidget);

    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();
    expect(find.text('Permitir a bolha'), findsOneWidget);

    await tester.tap(find.text('Abrir configurações'));
    await tester.pumpAndSettle();
    verify(translator.openPermissionSettings).called(1);
    verifyNever(translator.start);
  });

  testWidgets('com permissão: liga direto', (tester) async {
    when(translator.hasPermission).thenAnswer((_) async => true);
    await pump(tester, translator);

    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();
    verify(translator.start).called(1);
    expect(tester.widget<SwitchListTile>(find.byType(SwitchListTile)).value, isTrue);
  });
}
