"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { errorMessage } from "@/lib/api";
import { signIn, signUp } from "@/lib/session";

type Mode = "login" | "register";

/** Só volta para caminhos internos (evita redirecionar para outro site via ?next=). */
export function safeNext(next: string | null): string {
  // "/\\evil.com" e "/\t/evil.com" viram "//evil.com" no navegador: só caminho com caracteres seguros
  return next && /^\/(?![/\\])[^\\\s]*$/.test(next) ? next : "/";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const register = mode === "register";
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (register && password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (register) await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      client.clear();
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="text-2xl font-bold text-primary-600">
          {register ? "Criar conta" : "Bem-vindo de volta"}
        </h2>
        <p className="mt-1 text-ink-soft">
          {register ? "Comece seu hábito diário de leitura." : "Continue sua leitura em inglês."}
        </p>
      </div>
      {register && (
        <TextField
          label="Nome"
          autoComplete="name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete={register ? "new-password" : "current-password"}
        placeholder={register ? "Mínimo 8 caracteres" : undefined}
        required
        maxLength={128}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-error-text">
          {error}
        </p>
      )}
      <Button type="submit" block loading={loading}>
        {register ? "Criar conta" : "Entrar"}
      </Button>
      <p className="text-center text-ink-soft">
        {register ? "Já tem conta? " : "Não tem conta? "}
        <Link
          href={register ? "/login" : "/cadastro"}
          className="font-semibold text-primary-600 hover:underline"
        >
          {register ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}
