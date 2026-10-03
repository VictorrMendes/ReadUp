import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../exceptions/api_exceptions.dart';
import '../storage/token_storage.dart';

/// Única porta HTTP do app (regra do projeto: repositórios nunca usam `package:http` direto).
/// JSON nos dois sentidos, token Bearer quando existe, erros como [ApiException].
abstract interface class HttpHelper {
  Future<Object?> get(String path);
  Future<Object?> post(String path, {Object? body});
  Future<Object?> put(String path, {Object? body});
  Future<Object?> patch(String path, {Object? body});
  Future<void> delete(String path);

  /// Envio de arquivo (PDF): multipart com o campo [field].
  Future<Object?> upload(String path, {required String field, required String filePath});
}

class HttpHelperImpl implements HttpHelper {
  HttpHelperImpl({
    required this._baseUrl,
    required this._client,
    required this._tokenStorage,
    this.onUnauthorized,
  });

  // rede ruim não pode deixar a tela carregando para sempre; o PDF é processado na hora pelo backend
  static const timeout = Duration(seconds: 20);
  static const uploadTimeout = Duration(seconds: 120);
  static const timeoutMessage =
      'O servidor demorou para responder. Verifique sua conexão e tente de novo.';
  static const offlineMessage =
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  static const unexpectedMessage = 'Erro inesperado. Tente novamente.';

  final String _baseUrl;
  final http.Client _client;
  final TokenStorage _tokenStorage;

  /// Chamado num 401 (sessão expirada): o app limpa o token e volta ao login.
  final void Function()? onUnauthorized;

  @override
  Future<Object?> get(String path) => _send('GET', path);

  @override
  Future<Object?> post(String path, {Object? body}) => _send('POST', path, body: body);

  @override
  Future<Object?> put(String path, {Object? body}) => _send('PUT', path, body: body);

  @override
  Future<Object?> patch(String path, {Object? body}) => _send('PATCH', path, body: body);

  @override
  Future<void> delete(String path) => _send('DELETE', path);

  @override
  Future<Object?> upload(String path, {required String field, required String filePath}) async {
    final request = http.MultipartRequest('POST', _uri(path))
      ..headers.addAll(await _headers(json: false))
      ..files.add(await http.MultipartFile.fromPath(field, filePath));
    return _handle(
      () async => http.Response.fromStream(await _client.send(request)),
      uploadTimeout,
    );
  }

  Future<Object?> _send(String method, String path, {Object? body}) async {
    final request = http.Request(method, _uri(path))
      ..headers.addAll(await _headers(json: body != null));
    if (body != null) request.body = jsonEncode(body);
    return _handle(() async => http.Response.fromStream(await _client.send(request)), timeout);
  }

  Uri _uri(String path) => Uri.parse('$_baseUrl$path');

  Future<Map<String, String>> _headers({required bool json}) async {
    final token = await _tokenStorage.read();
    return {
      'Accept': 'application/json',
      if (json) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<Object?> _handle(Future<http.Response> Function() send, Duration limit) async {
    final http.Response response;
    try {
      response = await send().timeout(limit);
    } on TimeoutException {
      throw const ConnectionException(timeoutMessage);
    } on SocketException {
      throw const ConnectionException(offlineMessage);
    } on http.ClientException {
      throw const ConnectionException(offlineMessage);
    }

    final status = response.statusCode;
    if (status >= 200 && status < 300) {
      // 204 (DELETE) e corpo vazio: nada a decodificar
      if (status == 204 || response.body.isEmpty) return null;
      return jsonDecode(utf8.decode(response.bodyBytes));
    }
    final detail = _detail(response);
    if (status == 401) {
      onUnauthorized?.call();
      throw UnauthorizedException(detail);
    }
    if (status < 500) throw ClientErrorException(detail, code: status);
    throw ServerErrorException(detail, code: status);
  }

  /// FastAPI responde `{"detail": "..."}`; erros de validação vêm como lista (mensagem genérica).
  String _detail(http.Response response) {
    try {
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (data case {'detail': final String detail}) return detail;
    } on FormatException {
      // corpo não-JSON (ex.: proxy): mensagem genérica
    }
    return unexpectedMessage;
  }
}
