import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/app.dart';
import 'package:readup/core/core.dart';
import 'package:readup/design_system/readup_colors.dart';
import 'package:readup/features/auth/presentation/blocs/auth_bloc.dart';

import 'fakes/mocks.dart';

void main() {
  testWidgets('abre com o tema do ReadUp (Material 3, papel, Inter + Literata)', (tester) async {
    final bloc = MockAuthBloc();
    when(() => bloc.state).thenReturn(const AuthInitial());

    await tester.pumpWidget(
      ReadUpApp(
        authBloc: bloc,
        authRepository: MockAuthRepository(),
        preferencesRepository: MockPreferencesRepository(),
        statsRepository: MockStatsRepository(),
        articlesRepository: MockArticlesRepository(),
        booksRepository: MockBooksRepository(),
        readingRepository: MockReadingRepository(),
        vocabularyRepository: MockVocabularyRepository(),
        speech: MockSpeech(),
        reminders: MockReminders(),
        floatingTranslator: MockFloatingTranslator(),
        readerSettings: MockReaderSettingsCubit(),
        streakVisibility: MockStreakVisibilityCubit(),
      ),
    );

    final context = tester.element(find.text('ReadUp'));
    final theme = Theme.of(context);
    expect(theme.useMaterial3, isTrue);
    expect(theme.scaffoldBackgroundColor, ReadUpColors.background);
    expect(context.readupText.reading.fontFamily, 'Literata');
    expect(context.textTheme.bodyLarge?.fontFamily, 'Inter');
  });
}
