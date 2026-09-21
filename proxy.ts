import { NextResponse, type NextRequest } from "next/server";

const COOKIE_SESSAO = "prospect_sessao";

/**
 * Checagem otimista: só confere se o cookie de sessão existe, para quem não
 * está logado não ver as telas internas. A assinatura do JWT não é validada
 * aqui — o Proxy pode rodar fora do runtime da aplicação (até numa CDN), então
 * a validação de verdade fica em exigirUsuario(), em cada rota de API.
 */
export function proxy(req: NextRequest) {
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
