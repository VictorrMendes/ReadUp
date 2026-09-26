import { EmptyState } from "@/components/empty-state";

export default function ExploreScreen() {
  return (
    <EmptyState
      icon="compass-outline"
      title="Ainda não há textos para explorar."
      message="Em breve você encontrará leituras em inglês para o seu nível aqui."
    />
  );
}
