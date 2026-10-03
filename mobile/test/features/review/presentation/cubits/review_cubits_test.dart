import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/features/review/presentation/cubits/review_cubit.dart';
import 'package:readup/features/vocabulary/presentation/cubits/vocabulary_cubit.dart';

import '../../../../fakes/fixtures.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockVocabularyRepository vocabulary;
  setUp(() => vocabulary = MockVocabularyRepository());

  group('vocabulário', () {
    blocTest<VocabularyCubit, VocabularyState>(
      'palavras e quantas estão na revisão de hoje',
      setUp: () {
        when(() => vocabulary.list()).thenAnswer((_) async => savedWords);
        when(() => vocabulary.reviewQueue()).thenAnswer((_) async => queueTwo);
      },
      build: () => VocabularyCubit(vocabulary: vocabulary),
      act: (cubit) => cubit.load(),
      expect: () => [const VocabularyState(words: savedWords, toReview: 2)],
    );

    blocTest<VocabularyCubit, VocabularyState>(
      'fila de revisão falhando só esconde o cartão de revisão',
      setUp: () {
        when(() => vocabulary.list()).thenAnswer((_) async => savedWords);
        when(() => vocabulary.reviewQueue()).thenAnswer((_) async => throw const RequestFailure());
      },
      build: () => VocabularyCubit(vocabulary: vocabulary),
      act: (cubit) => cubit.load(),
      expect: () => [const VocabularyState(words: savedWords)],
    );

    blocTest<VocabularyCubit, VocabularyState>(
      'remover tira da lista; falha avisa e mantém',
      setUp: () {
        when(() => vocabulary.delete(1)).thenAnswer((_) async {});
        when(() => vocabulary.delete(2)).thenAnswer((_) async => throw const RequestFailure());
      },
      build: () => VocabularyCubit(vocabulary: vocabulary),
      seed: () => const VocabularyState(words: savedWords, toReview: 1),
      act: (cubit) async {
        await cubit.remove(savedWords[0]);
        await cubit.remove(savedWords[1]);
      },
      expect: () => [
        VocabularyState(words: [savedWords[1]], toReview: 1),
        VocabularyState(words: [savedWords[1]], toReview: 1, removeFailed: true),
      ],
    );
  });

  group('revisão', () {
    test('acerto vai ao servidor e soma XP; "ainda aprendendo" vira treino sem servidor', () async {
      when(() => vocabulary.reviewQueue()).thenAnswer((_) async => queueTwo);
      when(() => vocabulary.answerReview(1, known: false)).thenAnswer((_) async => 0);
      when(() => vocabulary.answerReview(2, known: true)).thenAnswer((_) async => 2);
      final cubit = ReviewCubit(vocabulary: vocabulary);
      await cubit.load();

      expect(await cubit.answer(known: false), isFalse); // sem revelar não responde
      cubit.reveal();
      expect(await cubit.answer(known: false), isFalse);
      cubit.reveal();
      expect(await cubit.answer(known: true), isTrue); // acerto de verdade: a tela vibra
      cubit.reveal();
      expect(cubit.state.session?.current?.practice, isTrue);
      await cubit.answer(known: true); // treino extra
      verifyNever(() => vocabulary.answerReview(1, known: true));
      expect(cubit.state.session?.current, isNull);
      expect(cubit.state.session?.xp, 2);
      await cubit.close();
    });

    test('409 (outro aparelho ou limite): segue sem contar', () async {
      when(() => vocabulary.reviewQueue()).thenAnswer((_) async => queueTwo);
      when(() => vocabulary.answerReview(any(), known: any(named: 'known')))
          .thenAnswer((_) async => throw const RequestFailure(code: 409));
      final cubit = ReviewCubit(vocabulary: vocabulary);
      await cubit.load();
      cubit.reveal();
      await cubit.answer(known: true);
      expect(cubit.state.session?.index, 1);
      expect(cubit.state.error, isNull);
      await cubit.close();
    });

    test('sem conexão: mantém o cartão e mostra o erro', () async {
      when(() => vocabulary.reviewQueue()).thenAnswer((_) async => queueTwo);
      when(() => vocabulary.answerReview(any(), known: any(named: 'known')))
          .thenAnswer((_) async => throw const RequestFailure(message: 'Sem conexão'));
      final cubit = ReviewCubit(vocabulary: vocabulary);
      await cubit.load();
      cubit.reveal();
      await cubit.answer(known: true);
      expect(cubit.state.session?.index, 0);
      expect(cubit.state.error, 'Não foi possível salvar a resposta. Tente de novo.');
      await cubit.close();
    });
  });
}
