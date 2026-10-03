import 'package:flutter_test/flutter_test.dart';
import 'package:readup/core/core.dart';

void main() {
  test('sucesso passa direto', () async {
    expect(await repositoryExceptionHandlerScope(() async => 42), 42);
  });

  test('erro da API vira RequestFailure com a mensagem e o código', () async {
    await expectLater(
      repositoryExceptionHandlerScope<void>(
        () async => throw const ClientErrorException('Limite diário', code: 429),
      ),
      throwsA(const RequestFailure(message: 'Limite diário', code: 429)),
    );
  });

  test('401 fica marcado como não autorizado', () async {
    await expectLater(
      repositoryExceptionHandlerScope<void>(
        () async => throw const UnauthorizedException('Token inválido'),
      ),
      throwsA(isA<RequestFailure>().having((f) => f.isUnauthorized, 'isUnauthorized', isTrue)),
    );
  });

  test('erro inesperado (ex.: JSON fora do formato) vira mensagem genérica', () async {
    await expectLater(
      repositoryExceptionHandlerScope<void>(() async => throw const FormatException('json')),
      throwsA(const RequestFailure()),
    );
  });
}
