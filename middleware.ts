import { NextResponse, type NextRequest } from "next/server";

const COOKIE_SESSAO = "prospect_sessao";

/**
 * Checagem otimista: o middleware roda no edge e não valida a assinatura do
 * JWT (jsonwebtoken precisa do runtime Node). Ele só evita que quem não tem
 * cookie veja as telas internas — a validação de verdade está em exigirUsuario(),
 * no servidor, em cada rota de API.
 */
export function middleware(req: NextRequest) {
  const temCookie = Boolean(req.cookies.get(COOKIE_SESSAO)?.value);
  const { pathname } = req.nextUrl;
  const ehLogin = pathname === "/login";

  if (!temCookie && !ehLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (temCookie && ehLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/pesquisas/:path*", "/admin/:path*"],
};
