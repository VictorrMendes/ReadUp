import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:readup/core/core.dart';
import 'package:readup/features/auth/domain/repositories/auth_repository.dart';

import '../../../../fakes/fake_token_storage.dart';
import '../../../../fakes/fixtures.dart';
import '../../../../fakes/mocks.dart';

void main() {
  late MockHttpHelper http;
  late FakeTokenStorage tokens;
  late AuthRepository repository;

  setUp(() {
    http = MockHttpHelper();
    tokens = FakeTokenStorage();
    repository = AuthRepository(httpHelper: http, tokenStorage: tokens);
  });

  test('login envia e-mail e senha e guarda o token', () async {
    when(() => http.post('/auth/login', body: any(named: 'body')))
        .thenAnswer((_) async => {'access_token': 'tok', 'token_type': 'bearer'});

    await repository.login(email: 'ana@example.com', password: 'segredo123');

    verify(
      () => http.post('/auth/login', body: {'email': 'ana@example.com', 'password': 'segredo123'}),
    ).called(1);
    expect(tokens.token, 'tok');
    expect(await repository.hasToken(), isTrue);
  });

  test('cadastro envia nome, e-mail e senha e guarda o token', () async {
    when(() => http.post('/auth/register', body: any(named: 'body')))
        .thenAnswer((_) async => {'access_token': 'novo', 'token_type': 'bearer'});

    await repository.register(name: 'Ana', email: 'ana@example.com', password: 'segredo123');

    expect(tokens.token, 'novo');
  });

  test('me converte o JSON no usuário (nível e meta)', () async {
    when(() => http.get('/users/me')).thenAnswer((_) async => userJson);

    expect(await repository.me(), onboardedUser);
  });

  test('erro da API sai como RequestFailure com a mensagem do servidor', () async {
    when(() => http.post('/auth/login', body: any(named: 'body')))
        .thenThrow(const ClientErrorException('E-mail ou senha incorretos', code: 401));

    await expectLater(
      repository.login(email: 'a@b.c', password: 'errada123'),
      throwsA(const RequestFailure(message: 'E-mail ou senha incorretos', code: 401)),
    );
    expect(tokens.token, isNull);
  });

  test('logout apaga o token', () async {
    tokens.token = 'tok';
    await repository.logout();
    expect(await repository.hasToken(), isFalse);
  });
}
