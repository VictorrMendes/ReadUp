import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { backendPath, sameOriginAllowed } from "@/lib/proxy-rules";
import { SESSION_COOKIE, backendUrl } from "@/lib/server/backend";

// Repassa as chamadas do app para a API com o token do cookie. Corpo e resposta passam direto
// (JSON e o upload multipart de PDF).

// API travada não pode prender a tela: o upload de PDF (processado na hora) tem mais folga
const TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 180_000;
async function forward(request: NextRequest, ctx: RouteContext<"/api/[...path]">) {
  const { path } = await ctx.params;
  const target = backendPath(path);
  if (!target) return NextResponse.json({ detail: "Não encontrado" }, { status: 404 });
  if (!sameOriginAllowed(request.method, request.headers.get("origin"), request.headers.get("host")))
    return NextResponse.json({ detail: "Origem não permitida" }, { status: 403 });

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const headers = new Headers({ Accept: "application/json" });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upload = request.method === "POST" && target === "/books";
  let response: Response;
  try {
    response = await fetch(`${backendUrl()}${target}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // corpo em stream (upload de PDF) precisa de duplex
      ...(hasBody ? { duplex: "half" } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(upload ? UPLOAD_TIMEOUT_MS : TIMEOUT_MS),
    } as RequestInit);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError")
      return NextResponse.json({ detail: "O servidor demorou para responder. Tente novamente." }, { status: 504 });
    return NextResponse.json({ detail: "Servidor indisponível. Tente novamente." }, { status: 502 });
  }

  const out = new NextResponse(response.status === 204 ? null : response.body, {
    status: response.status,
  });
  const outType = response.headers.get("content-type");
  if (outType) out.headers.set("Content-Type", outType);
  out.headers.set("Cache-Control", "no-store");
  // token inválido/expirado: limpa o cookie para o app voltar ao login
  if (response.status === 401) out.cookies.delete(SESSION_COOKIE);
  return out;
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
