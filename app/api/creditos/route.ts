import { NextResponse } from "next/server";
import { ehAdmin, exigirUsuario } from "@/lib/auth";
import { carregarHistorico } from "@/lib/historico";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Histórico de consumo. O admin vê todas as contas; o usuário, só a dele. */
export async function GET() {
  try {
    const user = await exigirUsuario();
    const dados = await carregarHistorico(ehAdmin(user) ? undefined : user.id);
    return NextResponse.json(dados);
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}
