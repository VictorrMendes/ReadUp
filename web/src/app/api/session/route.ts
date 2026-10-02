import { NextResponse, type NextRequest } from "next/server";

import { sameOriginAllowed } from "@/lib/proxy-rules";
import { SESSION_COOKIE, backendUrl, sessionCookieOptions } from "@/lib/server/backend";

type SessionBody = { mode?: unknown; name?: unknown; email?: unknown; password?: unknown };

/** Login ou cadastro: chama a API e guarda o token num cookie httpOnly (nunca vai ao JS). */
export async function POST(request: NextRequest) {
  if (!sameOriginAllowed("POST", request.headers.get("origin"), request.headers.get("host")))
    return NextResponse.json({ detail: "Origem não permitida" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as SessionBody;
  const register = body.mode === "register";
  const payload = register
    ? { name: body.name, email: body.email, password: body.password }
    : { email: body.email, password: body.password };

  let response: Response;
  try {
    response = await fetch(`${backendUrl()}/auth/${register ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Servidor indisponível. Tente novamente." }, { status: 502 });
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || typeof data?.access_token !== "string") {
    const detail = typeof data?.detail === "string" ? data.detail : "Não foi possível entrar.";
    return NextResponse.json({ detail }, { status: response.ok ? 502 : response.status });
  }

  const out = NextResponse.json({ ok: true });
  out.cookies.set(SESSION_COOKIE, data.access_token, sessionCookieOptions);
  return out;
}

/** Sair: apaga o cookie (o token expira sozinho na API). */
export async function DELETE(request: NextRequest) {
  if (!sameOriginAllowed("DELETE", request.headers.get("origin"), request.headers.get("host")))
    return NextResponse.json({ detail: "Origem não permitida" }, { status: 403 });
  const out = NextResponse.json({ ok: true });
  out.cookies.delete(SESSION_COOKIE);
  return out;
}
