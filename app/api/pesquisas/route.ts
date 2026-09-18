import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/lib/auth";
import { criarAlieviService } from "@/lib/alievi";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";
import { pesquisaPublica } from "@/lib/publico";
import { lerFiltros } from "@/lib/filtros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cards do dashboard: as pesquisas do usuário, da mais recente para a mais antiga. */
export async function GET() {
  try {
    const user = await exigirUsuario();

    const pesquisas = await prisma.research.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { extractions: true } } },
    });

    return NextResponse.json({ pesquisas: pesquisas.map(pesquisaPublica) });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}

/**
 * Estima as oportunidades, cria a pesquisa na Alievi e guarda tudo no banco.
 * Nada aqui consome crédito.
 */
export async function POST(req: Request) {
  try {
    const user = await exigirUsuario();
    const filtros = lerFiltros(await req.json());

    const alievi = criarAlieviService();
    const estimativa = await alievi.estimar(filtros);

    // Sem oportunidades não vale criar pesquisa nem na Alievi nem no banco.
    if (estimativa.totalLeads === 0) {
      return NextResponse.json({ ...estimativa, pesquisa: null });
    }

    // Se a Alievi falhar, ainda guardamos a pesquisa com a estimativa;
    // o alieviResearchId fica nulo e a extração avisa que precisa refazer.
    let alieviResearchId: string | null = null;
    try {
      alieviResearchId = await alievi.criarPesquisa(filtros, estimativa.totalLeads);
    } catch {
      alieviResearchId = null;
    }

    const pesquisa = await prisma.research.create({
      data: {
        userId: user.id,
        name: filtros.nome,
        cnae: filtros.cnae,
        state: filtros.estado,
        capitalMin: filtros.capitalMin,
        capitalMax: filtros.capitalMax,
        estimatedLeads: estimativa.totalLeads,
        estimatedCompanies: estimativa.totalEmpresas,
        alieviResearchId,
      },
    });

    return NextResponse.json({ ...estimativa, pesquisa: pesquisaPublica(pesquisa) });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}
