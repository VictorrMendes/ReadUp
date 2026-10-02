import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { SegmentedControl } from "@/components/segmented-control";
import { useAuth } from "@/lib/auth";
import { LibraryList } from "@/screens/library-list";
import { TextFeed } from "@/screens/text-feed";
import { colors, spacing } from "@/theme";

const SECTIONS = [
  { value: "texts", label: "Para você" },
  { value: "news", label: "Notícias" },
  { value: "books", label: "Meus livros" },
] as const;

export type ReadSection = (typeof SECTIONS)[number]["value"];

function isSection(value: string | undefined): value is ReadSection {
  return SECTIONS.some((s) => s.value === value);
}

/** Aba Ler: textos do nível da pessoa, notícias e os livros (PDFs) dela. `?section=` abre uma seção. */
export default function ReadScreen() {
  const { user } = useAuth();
  // a seção vive no parâmetro da rota: navegar de fora com ?section= (ex.: voltar de um livro abre
  // "Meus livros") e tocar no seletor usam o mesmo estado
  const params = useLocalSearchParams<{ section?: string }>();
  const section: ReadSection = isSection(params.section) ? params.section : "texts";

  function select(next: ReadSection) {
    router.setParams({ section: next });
  }

  const level = user?.english_level ?? null;
  return (
    <View style={styles.screen}>
      <View style={styles.bar}>
        <SegmentedControl
          options={[...SECTIONS]}
          value={section}
          onChange={select}
          accessibilityLabel="Seção"
        />
      </View>
      {/* key: cada seção começa do zero (filtro e lista próprios) */}
      {section === "texts" && <TextFeed key="texts" initialLevel={level} />}
      {section === "news" && <TextFeed key="news" initialLevel={level} category="Notícias" />}
      {section === "books" && <LibraryList />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
