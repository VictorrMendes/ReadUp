const _weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const _months = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

extension ReadUpDate on DateTime {
  /// "Quinta, 2 de outubro"
  String get longDate => '${_weekdays[weekday - 1]}, $day de ${_months[month - 1]}';

  /// Nome do dia da semana: "Quinta"
  String get weekdayName => _weekdays[weekday - 1];
}

/// Dia do calendário vindo da API ("2026-03-12"), sem hora: lido em UTC para o fuso do aparelho
/// não trocar o dia.
DateTime calendarDay(String isoDate) => DateTime.parse('${isoDate}T00:00:00Z');
