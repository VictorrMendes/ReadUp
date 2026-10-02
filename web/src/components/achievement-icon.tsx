import { Award, BookOpen, Flag, Flame, GraduationCap, Library, ScrollText, type LucideIcon } from "lucide-react";

// ícones do catálogo de conquistas (nomes do Ionicons no backend) → lucide
const ICONS: Record<string, LucideIcon> = {
  "book-outline": BookOpen,
  "library-outline": Library,
  library: Library,
  "reader-outline": ScrollText,
  reader: ScrollText,
  school: GraduationCap,
  "flag-outline": Flag,
  flag: Flag,
  "flame-outline": Flame,
  flame: Flame,
};

export function AchievementIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Award;
  return <Icon className={className} aria-hidden />;
}
