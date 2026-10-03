import 'build_config.dart';
import 'run_app.dart';

// flutter run -t lib/main_dev.dart --dart-define=API_URL=http://192.168.0.10:8000
// Sem API_URL: o emulador Android enxerga o computador em 10.0.2.2.
void main() => runReadUp(
  const BuildConfig(
    environment: Environment.dev,
    apiUrl: String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:8000'),
  ),
);
