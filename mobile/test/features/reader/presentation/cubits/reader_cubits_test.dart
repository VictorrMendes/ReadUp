import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/features/reader/domain/end_state.dart';
import 'package:readup/features/reader/presentation/cubits/reader_cubit.dart';
import 'package:readup/features/reader/presentation/cubits/sentence_cubit.dart';
import 'package:readup/features/reader/presentation/cubits/word_cubit.dart';
import 'package:readup/shared/domain/models/vocabulary.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/mocks.dart';

const savedHouse = SavedWord(
  id: 7,
  word: 'house',
  translation: 'casa',
  context: 'The house is big.',
  articleId: 10,
  articleTitle: 'X',
);

void main() {
  late MockReadingRepository reading;
  late MockStatsRepository stats;
  late MockVocabularyRepository vocabulary;

  setUp(() {
    reading = MockReadingRepository();
    stats = MockStatsRepository();
    vocabulary = MockVocabularyRepository();
    when(() => reading.article(10)).thenAnswer((_) async => articleDetail(progress: 30));
    when(
      () => reading.saveProgress(
        articleId: any(named: 'articleId'),
        progress: any(named: 'progress'),
        seconds: any(named: 'seconds'),
      ),
    ).thenAnswer((_) async => progressResult());
    when(() => vocabulary.list()).thenAnswer((_) async => [savedHouse]);
  });

  ReaderCubit build() =>
      ReaderCubit(reading: reading, stats: stats, vocabulary: vocabulary, articleId: 10);

  group('leitor', () {
    test('abre o texto, abre a sessão no servidor (0 s) e marca as palavras salvas', () async {
      final cubit = build();
      await cubit.load();

      expect(cubit.state.article?.summary.id, 10);
      expect(cubit.state.savedWords, {'house'});
      verify(() => reading.saveProgress(articleId: 10, progress: 30, seconds: 0)).called(1);
      await cubit.close();
    });

    test('concluir rápido demais: diz quantos segundos faltam', () async {
      final cubit = build();
      await cubit.load();
      await cubit.finish();

      expect(cubit.state.endState, isA<EndTooFast>().having((e) => e.seconds, 'seconds', 54));
      expect(cubit.state.celebration, isNull);
      await cubit.close();
    });

    test('concluir de verdade: busca meta e recorde e abre a conclusão', () async {
      when(() => reading.saveProgress(articleId: 10, progress: 100, seconds: any(named: 'seconds')))
          .thenAnswer((_) async => progressResult(completed: true, words: 540, xp: 64));
      when(() => stats.goal()).thenAnswer((_) async => goalDone);
      when(() => stats.summary()).thenAnswer((_) async => summaryWith(longest: 21));
      final cubit = build();
      await cubit.load();
      await cubit.finish();

      expect(cubit.state.done, isTrue);
      expect(cubit.state.celebration, const Celebration(goal: goalDone, longestStreak: 21));
      expect(cubit.state.gains.xp, 64);
      await cubit.close();
    });

    test('meta e recorde falhando não impedem a conclusão', () async {
      when(() => reading.saveProgress(articleId: 10, progress: 100, seconds: any(named: 'seconds')))
          .thenAnswer((_) async => progressResult(completed: true));
      when(() => stats.goal()).thenAnswer((_) async => throw const RequestFailure());
      when(() => stats.summary()).thenAnswer((_) async => throw const RequestFailure());
      final cubit = build();
      await cubit.load();
      await cubit.finish();

      expect(cubit.state.celebration, const Celebration(goal: null, longestStreak: null));
      await cubit.close();
    });

    test('sem conexão ao concluir: "não foi possível confirmar"', () async {
      final cubit = build();
      await cubit.load();
      when(() => reading.saveProgress(articleId: 10, progress: 100, seconds: any(named: 'seconds')))
          .thenAnswer((_) async => throw const RequestFailure(message: 'Sem conexão'));
      await cubit.finish();

      expect(cubit.state.endState, isA<EndError>());
      expect(cubit.state.finishing, isFalse);
      await cubit.close();
    });

    blocTest<ReaderCubit, ReaderState>(
      'texto de outra pessoa ou inexistente: não encontrado',
      setUp: () => when(() => reading.article(10)).thenAnswer(
        (_) async => throw const RequestFailure(message: 'Texto não encontrado', code: 404),
      ),
      build: build,
      act: (cubit) => cubit.load(),
      expect: () => [const ReaderState(error: 'Texto não encontrado', notFound: true)],
    );
  });

  group('palavra', () {
    WordCubit word() => WordCubit(
      vocabulary: vocabulary,
      word: 'house',
      sentence: 'The house is big.',
      articleId: 10,
    );

    blocTest<WordCubit, WordState>(
      'traduz e salva com a frase de contexto (salto só para quem salvou agora)',
      setUp: () {
        when(
          () => vocabulary.lookup('house'),
        ).thenAnswer((_) async => const Lookup(word: 'house', translation: 'casa', savedId: null));
        when(() => vocabulary.save(word: 'house', articleId: 10, context: 'The house is big.'))
            .thenAnswer((_) async => savedHouse);
      },
      build: word,
      act: (cubit) async {
        await cubit.load();
        await cubit.save();
      },
      expect: () => [
        const WordState(
          lookup: Lookup(word: 'house', translation: 'casa', savedId: null),
        ),
        const WordState(
          lookup: Lookup(word: 'house', translation: 'casa', savedId: null),
          busy: true,
        ),
        const WordState(
          lookup: Lookup(word: 'house', translation: 'casa', savedId: null),
          savedId: 7,
          justSaved: true,
        ),
      ],
    );

    blocTest<WordCubit, WordState>(
      'já salva: remover volta para "Salvar palavra"',
      setUp: () {
        when(() => vocabulary.lookup('house'))
            .thenAnswer((_) async => const Lookup(word: 'house', translation: 'casa', savedId: 7));
        when(() => vocabulary.delete(7)).thenAnswer((_) async {});
      },
      build: word,
      act: (cubit) async {
        await cubit.load();
        await cubit.remove();
      },
      verify: (cubit) => expect(cubit.state.savedId, isNull),
    );

    blocTest<WordCubit, WordState>(
      'tradução fora do ar: ainda dá para salvar (mostra "indisponível")',
      setUp: () =>
          when(() => vocabulary.lookup('house'))
              .thenAnswer((_) async => throw const RequestFailure()),
      build: word,
      act: (cubit) => cubit.load(),
      expect: () => [
        const WordState(lookup: Lookup(word: 'house', translation: null, savedId: null)),
      ],
    );
  });

  group('frase', () {
    SentenceCubit sentence() =>
        SentenceCubit(vocabulary: vocabulary, articleId: 10, sentence: 'The house is big.');

    blocTest<SentenceCubit, SentenceState>(
      'traduz a frase',
      setUp: () =>
          when(() => vocabulary.translateSentence(articleId: 10, text: 'The house is big.'))
              .thenAnswer((_) async => 'A casa é grande.'),
      build: sentence,
      act: (cubit) => cubit.translate(),
      expect: () => [const SentenceLoading(), const SentenceTranslated('A casa é grande.')],
    );

    blocTest<SentenceCubit, SentenceState>(
      'limite diário (429): mensagem própria',
      setUp: () => when(
        () => vocabulary.translateSentence(
          articleId: any(named: 'articleId'),
          text: any(named: 'text'),
        ),
      ).thenAnswer((_) async => throw const RequestFailure(code: 429)),
      build: sentence,
      act: (cubit) => cubit.translate(),
      expect: () => [const SentenceLoading(), const SentenceFailure(SentenceCubit.limitReached)],
    );
  });
}
