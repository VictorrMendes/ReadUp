import '../../../../core/core.dart';
import '../models/user.dart';

class AuthRepository {
  AuthRepository({required this._httpHelper, required this._tokenStorage});

  final HttpHelper _httpHelper;
  final TokenStorage _tokenStorage;

  Future<bool> hasToken() async => await _tokenStorage.read() != null;

  /// Entra e guarda o token; o usuário vem em seguida por [me].
  Future<void> login({required String email, required String password}) =>
      repositoryExceptionHandlerScope(() async {
        final response = await _httpHelper.post(
          '/auth/login',
          body: {'email': email, 'password': password},
        );
        await _saveToken(response);
      });

  Future<void> register({required String name, required String email, required String password}) =>
      repositoryExceptionHandlerScope(() async {
        final response = await _httpHelper.post(
          '/auth/register',
          body: {'name': name, 'email': email, 'password': password},
        );
        await _saveToken(response);
      });

  Future<User> me() => repositoryExceptionHandlerScope(() async {
    final response = await _httpHelper.get('/users/me');
    return User.fromJson(response! as Map<String, Object?>);
  });

  Future<void> logout() => _tokenStorage.clear();

  Future<void> _saveToken(Object? response) async {
    final json = response! as Map<String, Object?>;
    await _tokenStorage.write(json['access_token']! as String);
  }
}
