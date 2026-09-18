import { NextResponse } from "next/server";
import { criarAlieviService, type CnaeItem } from "@/lib/alievi";
import { mensagemDeErro } from "@/lib/erros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A tabela de CNAEs é estática (muda de ano em ano), então vale um cache em
 * memória para não refazer login + download de ~230 KB a cada carregamento.
 */
const TTL_MS = 60 * 60 * 1000;
let cache: { cnaes: CnaeItem[]; expiraEm: number } | null = null;

export async function GET() {
  try {
    if (!cache || Date.now() > cache.expiraEm) {
      const cnaes = await criarAlieviService().listarCnaes();
      cache = { cnaes, expiraEm: Date.now() + TTL_MS };
    }

    return NextResponse.json({ cnaes: cache.cnaes });
  } catch (error) {
    return NextResponse.json({ error: mensagemDeErro(error) }, { status: 500 });
  }
}
