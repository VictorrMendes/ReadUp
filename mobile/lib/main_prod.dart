import 'build_config.dart';
import 'run_app.dart';

// flutter build apk -t lib/main_prod.dart --dart-define=API_URL=https://api.exemplo.com
void main() {
  const apiUrl = String.fromEnvironment('API_URL');
  if (apiUrl.isEmpty) throw StateError('Defina --dart-define=API_URL para o build de produção.');
  runReadUp(const BuildConfig(environment: Environment.prod, apiUrl: apiUrl));
}
