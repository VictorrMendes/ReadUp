import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

/// Horário do lembrete diário ("quando você vai ler?", intenção se-então).
enum ReminderTime {
  morning('Manhã', 'Todo dia às 8h', 8),
  afternoon('Tarde', 'Todo dia às 13h', 13),
  evening('Noite', 'Todo dia às 20h', 20),
  off('Sem lembrete', 'Não enviar notificações', null);

  const ReminderTime(this.label, this.description, this.hour);

  final String label;
  final String description;
  final int? hour;
}

const defaultReminder = ReminderTime.evening;
const reminderDaysAhead = 7;

/// Próximos lembretes: hoje (se ainda não passou e o dia não está garantido) e os seguintes, até
/// [days]. Só alguns dias à frente: quem para de abrir o app para de receber (melhor que insistir).
List<DateTime> reminderDates(
  ReminderTime time,
  DateTime now, {
  required bool doneToday,
  int days = reminderDaysAhead,
}) {
  final hour = time.hour;
  if (hour == null) return const [];
  final dates = <DateTime>[];
  for (var offset = 0; dates.length < days; offset++) {
    final date = DateTime(now.year, now.month, now.day + offset, hour);
    if (offset == 0 && (doneToday || !date.isAfter(now))) continue;
    dates.add(date);
  }
  return dates;
}

/// Texto do lembrete: rodízio de convites curtos, nunca culpa (plan.txt §4.6). Com a ofensiva
/// em jogo (e visível), um dos textos fala dela de forma positiva.
({String title, String body}) reminderMessage(DateTime date, {required int streak}) {
  final messages = [
    if (streak > 0)
      (
        title: 'Mais um dia para a sua ofensiva de $streak ${streak == 1 ? 'dia' : 'dias'}',
        body: 'Um texto curto já mantém.',
      ),
    (title: 'Hora da leitura', body: 'Que tal um texto curto em inglês agora?'),
    (title: 'Uma leitura rapidinha?', body: 'Cinco minutos já contam.'),
    (title: 'Seu inglês agradece', body: 'Tem texto novo no seu nível esperando.'),
  ];
  return messages[date.difference(DateTime(2026)).inDays.abs() % messages.length];
}

/// Lembrete diário: notificação local (sem servidor). Escolha guardada no aparelho.
abstract interface class Reminders {
  Future<ReminderTime> current();

  /// Salva a escolha; ligar pede a permissão do sistema. Negada: guarda "off" e devolve false.
  Future<bool> set(ReminderTime time);

  /// Reagenda os próximos dias (chamado ao abrir o Início).
  Future<void> sync({required bool doneToday, required int streak});

  /// Sair da conta: a mensagem traz a ofensiva de quem saiu.
  Future<void> cancelAll();
}

class LocalReminders implements Reminders {
  LocalReminders({FlutterLocalNotificationsPlugin? plugin, SharedPreferencesAsync? preferences})
    : _plugin = plugin ?? FlutterLocalNotificationsPlugin(),
      _preferences = preferences ?? SharedPreferencesAsync();

  static const _key = 'readup.reminder';
  static const _channel = AndroidNotificationDetails(
    'reading-reminder',
    'Lembrete de leitura',
    channelDescription: 'Um lembrete por dia no horário escolhido',
  );

  final FlutterLocalNotificationsPlugin _plugin;
  final SharedPreferencesAsync _preferences;
  bool _ready = false;

  Future<void> _init() async {
    if (_ready) return;
    tz_data.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation((await FlutterTimezone.getLocalTimezone()).identifier));
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        // a permissão é pedida na escolha do horário, não ao abrir o app
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
    );
    _ready = true;
  }

  @override
  Future<ReminderTime> current() async {
    try {
      return ReminderTime.values.asNameMap()[await _preferences.getString(_key)] ?? defaultReminder;
    } catch (_) {
      return defaultReminder;
    }
  }

  @override
  Future<bool> set(ReminderTime time) async {
    try {
      await _init();
      var granted = true;
      if (time != ReminderTime.off) granted = await _requestPermission();
      final value = granted ? time : ReminderTime.off;
      await _preferences.setString(_key, value.name);
      if (value == ReminderTime.off) await _plugin.cancelAll();
      return granted;
    } catch (_) {
      return false;
    }
  }

  Future<bool> _requestPermission() async {
    final android = _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (android != null) return await android.requestNotificationsPermission() ?? false;
    final ios = _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
    return await ios?.requestPermissions(alert: true, sound: true) ?? false;
  }

  @override
  Future<void> sync({required bool doneToday, required int streak}) async {
    try {
      await _init();
      await _plugin.cancelAll();
      final time = await current();
      for (final (i, date) in reminderDates(time, DateTime.now(), doneToday: doneToday).indexed) {
        final message = reminderMessage(date, streak: streak);
        await _plugin.zonedSchedule(
          id: i,
          title: message.title,
          body: message.body,
          scheduledDate: tz.TZDateTime.from(date, tz.local),
          notificationDetails: const NotificationDetails(
            android: _channel,
            iOS: DarwinNotificationDetails(),
          ),
          // sem horário exato: dispensa a permissão de alarme exato (alguns minutos de folga)
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        );
      }
    } catch (_) {
      // sem permissão ou plataforma sem suporte: o app segue sem lembrete
    }
  }

  @override
  Future<void> cancelAll() async {
    try {
      await _init();
      await _plugin.cancelAll();
    } catch (_) {}
  }
}
