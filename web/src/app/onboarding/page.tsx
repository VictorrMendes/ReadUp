"use client";

import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { OptionList } from "@/components/ui/option-list";
import { errorMessage } from "@/lib/api";
import { ME_KEY, useMe } from "@/lib/session";
import { GOAL_OPTIONS, LEVEL_OPTIONS, setGoal, setLevel, type Level } from "@/lib/user";

export default function OnboardingPage() {
  const me = useMe();
  if (me.isError && !me.data) {
    return (
      <div role="alert" className="grid min-h-dvh place-items-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/mascot.png" alt="" width={96} height={96} priority />
          <p className="font-semibold">Não foi possível carregar sua conta.</p>
          <Button onClick={() => void me.refetch()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }
  if (!me.data) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Carregando">
        <Image src="/mascot.png" alt="" width={96} height={96} className="animate-pulse" priority />
      </div>
    );
  }
  return (
    <Onboarding initialLevel={me.data.english_level} initialGoal={me.data.daily_goal} />
  );
}

function Onboarding({ initialLevel, initialGoal }: { initialLevel: Level | null; initialGoal: number | null }) {
  const router = useRouter();
  const client = useQueryClient();
  const [level, setLevelChoice] = useState<Level | null>(initialLevel);
  const [goal, setGoalChoice] = useState<number | null>(initialGoal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!level || !goal) return;
    setSaving(true);
    setError(null);
    try {
      await setLevel(level);
      await setGoal(goal);
      await client.invalidateQueries({ queryKey: ME_KEY });
      router.replace("/");
    } catch (e) {
      setError(errorMessage(e, "Não foi possível salvar. Tente novamente."));
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-6 pb-32 pt-10">
      <Image src="/mascot.png" alt="" width={96} height={96} priority />
      <h1 className="text-3xl font-bold">Vamos começar</h1>
      <p className="text-ink-soft">
        Escolha seu nível e quanto quer ler por dia. Dá para mudar depois no Perfil.
      </p>

      <h2 className="mt-4 text-lg font-semibold">Seu nível de inglês</h2>
      <OptionList options={LEVEL_OPTIONS} value={level} onChange={setLevelChoice} label="Seu nível de inglês" />

      <h2 className="mt-4 text-lg font-semibold">Meta diária</h2>
      <OptionList options={GOAL_OPTIONS} value={goal} onChange={setGoalChoice} label="Meta diária" />

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm text-error-text">
              {error}
            </p>
          )}
          <Button block loading={saving} disabled={!level || !goal} onClick={() => void start()}>
            Começar
          </Button>
          {(!level || !goal) && (
            <p className="text-center text-xs text-ink-soft">Escolha nível e meta para continuar</p>
          )}
        </div>
      </div>
    </main>
  );
}
