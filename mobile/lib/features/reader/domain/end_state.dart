/// teto de crédito do servidor (app/reading/rules.py): 10 palavras por segundo de leitura
const maxWordsPerSecond = 10;

/// Segundos de leitura que ainda faltam para o servidor creditar o texto inteiro.
int secondsToComplete(int wordCount, int wordsRead) =>
    ((wordCount - wordsRead).clamp(0, wordCount) / maxWordsPerSecond).ceil().clamp(1, 1 << 31);

/// O que aparece no fim do texto.
sealed class EndState {
  const EndState();
}

/// já concluído: "Você já concluiu este texto" + ações
final class EndDone extends EndState {
  const EndDone();
}

/// botão "Concluir leitura"
final class EndReady extends EndState {
  const EndReady();
}

/// botão + "leia com calma: faltam ~N s" (o servidor não creditou o texto inteiro)
final class EndTooFast extends EndState {
  const EndTooFast(this.seconds);
  final int seconds;
}

/// botão + "Não foi possível confirmar agora"
final class EndError extends EndState {
  const EndError();
}
