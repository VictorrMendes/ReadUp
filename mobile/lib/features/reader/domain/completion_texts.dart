import '../../../core/core.dart';

const _phrases = ['Mais um texto lido!', 'Mandou bem!', 'Leitura concluída'];
const _milestones = [3, 7, 14, 30, 50, 66, 100, 365];

/// Título: marco quando a ofensiva subiu nesta leitura; senão uma das 3 frases ([pick] de 0 a 1).
String completionTitle({required int streak, required bool streakUp, required double pick}) {
  if (streakUp && _milestones.contains(streak)) return '$streak dias seguidos!';
  return _phrases[(pick * _phrases.length).floor() % _phrases.length];
}

/// Frase dos marcos grandes (66 dias = tempo médio para um hábito se firmar, Lally et al. 2010).
String? milestoneNote(int streak) => switch (streak) {
  7 => 'Uma semana inteira lendo em inglês.',
  30 => 'Um mês: ler já faz parte do seu dia.',
  66 => '66 dias: o tempo médio para um hábito se firmar.',
  100 => '100 dias de leitura. Poucos chegam aqui.',
  365 => 'Um ano inteiro lendo. Que jornada!',
  _ => null,
};

String streakNote(int streak, int? longest) {
  if (longest == null) return '+1 hoje';
  if (streak >= longest) return 'Novo recorde!';
  return '+1 hoje · faltam ${(longest - streak).asDays} para o recorde';
}
