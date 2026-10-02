import * as Speech from "expo-speech";

/** Pronúncia em inglês pela voz do aparelho (offline, sem custo). Interrompe a fala anterior. */
export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: "en-US", rate: 0.9 });
}
