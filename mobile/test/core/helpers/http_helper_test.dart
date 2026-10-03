import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:readup/core/core.dart';

import '../../fakes/fake_token_storage.dart';

void main() {
  late List<http.Request> sent;

  HttpHelperImpl helper(
    MockClientHandler handler, {
    String? token,
    void Function()? onUnauthorized,
  }) {
    sent = [];
    return HttpHelperImpl(
      baseUrl: 'http://api.test',
      client: MockClient((request) {
        sent.add(request);
        return handler(request);
      }),
      tokenStorage: FakeTokenStorage(token),
      onUnauthorized: onUnauthorized,
    );
  }

  http.Response json(Object body, int status) => http.Response(
    jsonEncode(body),
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );

  test('envia JSON com Bearer e decodifica a resposta (acentos inclusive)', () async {
    final api = helper((_) async => json({'name': 'Ação'}, 200), token: 'tok');

    final result = await api.post('/x', body: {'a': 1});

    expect(result, {'name': 'Ação'});
    expect(sent.single.url.toString(), 'http://api.test/x');
    expect(sent.single.headers['Authorization'], 'Bearer tok');
    expect(sent.single.headers['Content-Type'], startsWith('application/json'));
    expect(jsonDecode(sent.single.body), {'a': 1});
  });

  test('sem token não manda Authorization; GET sem corpo não manda Content-Type', () async {
    final api = helper((_) async => json([], 200));

    await api.get('/x');

    expect(sent.single.headers.containsKey('Authorization'), isFalse);
    expect(sent.single.headers.containsKey('Content-Type'), isFalse);
  });

  test('204 devolve null', () async {
    final api = helper((_) async => http.Response('', 204));
    await expectLater(api.delete('/x'), completes);
  });

  test('4xx vira ClientErrorException com o detail da FastAPI', () async {
    final api = helper((_) async => json({'detail': 'E-mail já cadastrado'}, 409));

    await expectLater(
      api.post('/x'),
      throwsA(
        isA<ClientErrorException>()
            .having((e) => e.code, 'code', 409)
            .having((e) => e.message, 'message', 'E-mail já cadastrado'),
      ),
    );
  });

  test('erro de validação (detail em lista) vira mensagem genérica', () async {
    final api = helper(
      (_) async => json({
        'detail': [
          {'msg': 'x'},
        ],
      }, 422),
    );

    await expectLater(
      api.post('/x'),
      throwsA(
        isA<ClientErrorException>().having(
          (e) => e.message,
          'message',
          HttpHelperImpl.unexpectedMessage,
        ),
      ),
    );
  });

  test('401 avisa o app (sessão expirada) e lança UnauthorizedException', () async {
    var notified = 0;
    final api = helper(
      (_) async => json({'detail': 'Token inválido'}, 401),
      onUnauthorized: () => notified++,
    );

    await expectLater(api.get('/x'), throwsA(isA<UnauthorizedException>()));
    expect(notified, 1);
  });

  test('5xx vira ServerErrorException; sem rede vira ConnectionException', () async {
    await expectLater(
      helper((_) async => http.Response('oops', 502)).get('/x'),
      throwsA(isA<ServerErrorException>().having((e) => e.code, 'code', 502)),
    );
    await expectLater(
      helper((_) async => throw const SocketException('offline')).get('/x'),
      throwsA(
        isA<ConnectionException>().having(
          (e) => e.message,
          'message',
          HttpHelperImpl.offlineMessage,
        ),
      ),
    );
  });
}
