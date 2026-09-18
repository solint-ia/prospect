import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Usado pelo frontend para saber quem está logado e o saldo de créditos. */
export async function GET() {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
