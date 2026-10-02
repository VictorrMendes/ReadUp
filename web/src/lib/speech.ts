// Pronúncia em inglês pela voz do navegador (Web Speech API): sem custo e sem servidor.

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function englishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === "en-US") ?? voices.find((v) => v.lang.startsWith("en"));
}

/** Fala o texto em inglês, interrompendo a fala anterior. */
export function speak(text: string) {
  if (!speechAvailable()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  const voice = englishVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (speechAvailable()) window.speechSynthesis.cancel();
}
