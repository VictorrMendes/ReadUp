import '../../../core/services/reminders.dart';
import '../../domain/constants/levels.dart';
import 'option_list.dart';

// opções de nível, meta e lembrete: as mesmas no onboarding e no Perfil
final levelOptions = [
  for (final level in EnglishLevel.values)
    OptionItem(value: level, label: level.code, description: level.description),
];
final goalOptionItems = [
  for (final words in goalOptions)
    OptionItem(
      value: words,
      label: '$words palavras',
      description: '~${(words / wordsPerMinute).ceil()} min por dia',
    ),
];
final reminderOptions = [
  for (final time in ReminderTime.values)
    OptionItem(value: time, label: time.label, description: time.description),
];
