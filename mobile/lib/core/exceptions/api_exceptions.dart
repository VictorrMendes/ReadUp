/// Erros de transporte que o [HttpHelper] lança. Repositórios não os deixam escapar: o
/// `repositoryExceptionHandlerScope` converte tudo em `RequestFailure` para o BLoC.
sealed class ApiException implements Exception {
  const ApiException(this.message, {this.code});

  /// Mensagem do servidor (`detail` da FastAPI) ou da falha de rede, já em português.
  final String message;
  final int? code;

  @override
  String toString() => '$runtimeType($code): $message';
}

/// 401: token ausente, expirado ou inválido. O app volta ao login.
final class UnauthorizedException extends ApiException {
  const UnauthorizedException(super.message) : super(code: 401);
}

/// Outros 4xx: validação, regra de negócio, limite diário, recurso inexistente.
final class ClientErrorException extends ApiException {
  const ClientErrorException(super.message, {required int super.code});
}

/// 5xx: falha do servidor.
final class ServerErrorException extends ApiException {
  const ServerErrorException(super.message, {required int super.code});
}

/// Sem resposta: sem rede, servidor fora do ar ou tempo esgotado.
final class ConnectionException extends ApiException {
  const ConnectionException(super.message);
}
