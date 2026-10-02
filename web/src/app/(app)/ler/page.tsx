"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Library } from "@/components/read/library";
import { TextFeed } from "@/components/read/text-feed";
import { Page } from "@/components/shell/page";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { NEWS_CATEGORY } from "@/lib/articles";
import { useMe } from "@/lib/session";

const SECTIONS = [
  { value: "textos", label: "Para você" },
  { value: "noticias", label: "Notícias" },
  { value: "livros", label: "Meus livros" },
] as const;

type Section = (typeof SECTIONS)[number]["value"];

function isSection(value: string | null): value is Section {
  return SECTIONS.some((s) => s.value === value);
}

function ReadSections() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: user } = useMe();
  const raw = params.get("secao");
  const section: Section = isSection(raw) ? raw : "textos";
  const level = user?.english_level ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-md">
        <SegmentedControl
          options={SECTIONS}
          value={section}
          onChange={(next) => router.replace(`/ler?secao=${next}`, { scroll: false })}
          label="Seção"
        />
      </div>
      {section === "textos" && <TextFeed key="textos" initialLevel={level} />}
      {section === "noticias" && <TextFeed key="noticias" initialLevel={level} category={NEWS_CATEGORY} />}
      {section === "livros" && <Library />}
    </div>
  );
}

export default function ReadPage() {
  return (
    <Page title="Ler">
      <Suspense>
        <ReadSections />
      </Suspense>
    </Page>
  );
}
