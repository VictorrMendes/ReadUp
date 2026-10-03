import 'package:flutter_tts/flutter_tts.dart';

/// Pronúncia em inglês pela voz do aparelho (offline, sem custo). Falar interrompe a fala anterior.
abstract interface class Speech {
  Future<void> speak(String text);
  Future<void> stop();
}

class DeviceSpeech implements Speech {
  DeviceSpeech({FlutterTts? tts}) : _tts = tts ?? FlutterTts();

  final FlutterTts _tts;
  var _configured = false;

  @override
  Future<void> speak(String text) async {
    try {
      if (!_configured) {
        await _tts.setLanguage('en-US');
        await _tts.setSpeechRate(0.45); // um pouco mais devagar que o padrão: dá para acompanhar
        _configured = true;
      }
      await _tts.stop();
      await _tts.speak(text);
    } catch (_) {
      // aparelho sem voz em inglês: o botão simplesmente não fala
    }
  }

  @override
  Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (_) {}
  }
}
