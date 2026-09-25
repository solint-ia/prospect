import { NextResponse } from "next/server";
import { criarAlieviService } from "@/lib/alievi";
import { exigirUsuario } from "@/lib/auth";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Autocomplete de municípios: `?busca=arac`. */
export async function GET(req: Request) {
  try {
    await exigirUsuario();

    const busca = new URL(req.url).searchParams.get("busca")?.trim() ?? "";
    if (busca.length < 2) return NextResponse.json({ cidades: [] });

    const cidades = await criarAlieviService().buscarCidades(busca);
    return NextResponse.json({ cidades: cidades.slice(0, 50) });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}
