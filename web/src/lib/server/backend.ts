import "server-only";

// Ponte entre o Next e a API FastAPI. O JWT fica num cookie httpOnly: o JavaScript do navegador
// nunca vê o token, e as chamadas do app passam por /api/* (mesma origem, sem CORS).

export const SESSION_COOKIE = "readup_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // igual à validade do token na API (30 dias)

export function backendUrl(): string {
  return (process.env.READUP_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
