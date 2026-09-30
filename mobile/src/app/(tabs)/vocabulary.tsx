import { router } from "expo-router";

import { EmptyState } from "@/components/empty-state";

export default function VocabularyScreen() {
  return (
    <EmptyState
      icon="language-outline"
      illustration={require("@/assets/images/empty-vocabulary.png")}
      title="Nenhuma palavra salva ainda"
      message="Toque em uma palavra durante a leitura para salvá-la aqui."
      action={{ label: "Explorar textos", onPress: () => router.navigate("/explore") }}
    />
  );
}
