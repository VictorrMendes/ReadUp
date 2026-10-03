part of 'home_bloc.dart';

sealed class HomeEvent extends Equatable {
  const HomeEvent();

  @override
  List<Object?> get props => [];
}

/// Abrir o Início, voltar para a aba, voltar do leitor ou puxar para atualizar.
final class HomeLoadRequested extends HomeEvent {
  const HomeLoadRequested({required this.level});

  /// nível da pessoa (para sugerir um texto quando não há nenhum em andamento)
  final EnglishLevel? level;

  @override
  List<Object?> get props => [level];
}
