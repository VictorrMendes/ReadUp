import { NextResponse, type NextRequest } from "next/server";

// Rotas públicas (sem login); o resto do app exige o cookie de sessão. A validade do token é
// conferida pela API: se expirar, /api/* devolve 401 e o app volta ao login.
const PUBLIC = ["/login", "/cadastro"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = request.cookies.has("readup_session");
  const isPublic = PUBLIC.includes(pathname);

  if (!loggedIn && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (loggedIn && isPublic) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  // tudo menos a ponte /api, arquivos do Next e arquivos públicos (ícones, sw, manifest)
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|ico|js|json|html|webmanifest|svg)$|manifest\\.webmanifest).*)"],
};
