import 'package:equatable/equatable.dart';

/// O que um BLoC recebe quando uma chamada falha: mensagem pronta para a tela e o código HTTP
/// (null sem resposta do servidor).
class RequestFailure extends Equatable implements Exception {
  const RequestFailure({this.message = defaultMessage, this.code, this.exception});

  static const defaultMessage = 'Erro inesperado. Tente novamente.';

  final String message;
  final int? code;
  final Object? exception;

  bool get isUnauthorized => code == 401;

  @override
  List<Object?> get props => [message, code];
}
