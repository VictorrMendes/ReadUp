import 'dart:developer';

import 'api_exceptions.dart';
import 'request_failure.dart';

/// Envolve toda chamada de repositório: qualquer erro sai como [RequestFailure], com a mensagem
/// do servidor quando existe. O BLoC só conhece [RequestFailure].
Future<T> repositoryExceptionHandlerScope<T>(Future<T> Function() body) async {
  try {
    return await body();
  } on RequestFailure {
    rethrow;
  } on ApiException catch (e) {
    throw RequestFailure(message: e.message, code: e.code, exception: e);
  } catch (e, stack) {
    // erro de programação (ex.: JSON fora do formato): registra e mostra a mensagem genérica
    log('Erro inesperado no repositório', name: 'readup', error: e, stackTrace: stack);
    throw RequestFailure(exception: e);
  }
}
