import 'package:intl/intl.dart';

final _decimal = NumberFormat.decimalPattern('pt_BR');

extension ReadUpNumber on num {
  /// 1000 → "1.000"
  String get formatted => _decimal.format(round());

  /// "1 dia", "3 dias", "0 dias"
  String get asDays => '$formatted ${this == 1 ? 'dia' : 'dias'}';
}
