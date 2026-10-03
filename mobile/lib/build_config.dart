/// Ambiente do app: o entrypoint (main_dev / main_prod) decide e passa adiante.
enum Environment { dev, prod }

class BuildConfig {
  const BuildConfig({required this.environment, required this.apiUrl});

  final Environment environment;

  /// URL base da API (FastAPI). Vem de `--dart-define=API_URL=...`.
  final String apiUrl;

  bool get isDev => environment == Environment.dev;
}
