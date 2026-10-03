import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/features/auth/domain/repositories/auth_repository.dart';
import 'package:readup/features/auth/presentation/blocs/auth_bloc.dart';
import 'package:readup/core/services/reminders.dart';
import 'package:readup/core/services/speech.dart';
import 'package:readup/features/read/domain/repositories/books_repository.dart';
import 'package:readup/features/reader/domain/models/reader_settings.dart';
import 'package:readup/features/reader/domain/repositories/reading_repository.dart';
import 'package:readup/features/reader/presentation/cubits/reader_settings_cubit.dart';
import 'package:readup/shared/domain/repositories/vocabulary_repository.dart';
import 'package:readup/shared/domain/repositories/articles_repository.dart';
import 'package:readup/shared/domain/repositories/preferences_repository.dart';
import 'package:readup/shared/domain/repositories/stats_repository.dart';
import 'package:readup/shared/presentation/cubits/streak_visibility_cubit.dart';

class MockHttpHelper extends Mock implements HttpHelper {}

class MockAuthRepository extends Mock implements AuthRepository {}

class MockPreferencesRepository extends Mock implements PreferencesRepository {}

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}

class MockStatsRepository extends Mock implements StatsRepository {}

class MockBooksRepository extends Mock implements BooksRepository {}

class MockReadingRepository extends Mock implements ReadingRepository {}

class MockVocabularyRepository extends Mock implements VocabularyRepository {}

class MockSpeech extends Mock implements Speech {}

class MockReminders extends Mock implements Reminders {}

class MockReaderSettingsCubit extends MockCubit<ReaderSettings> implements ReaderSettingsCubit {}

class MockArticlesRepository extends Mock implements ArticlesRepository {}

class MockStreakVisibilityCubit extends MockCubit<bool?> implements StreakVisibilityCubit {}
