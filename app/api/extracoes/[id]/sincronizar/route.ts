import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ehAdmin, exigirUsuario } from "@/lib/auth";
import { criarAlieviService } from "@/lib/alievi";
import {
  concluirExtracao,
  falharExtracao,
  reencontrarNoServico,
} from "@/lib/extracao";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";
import { extracaoPublica } from "@/lib/publico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Busca no serviço o desfecho de uma extração que não terminou dentro da
 * requisição original — inclusive as antigas, que falharam antes de o ID remoto
 * passar a ser gravado. Não dispara nada novo, então não gera custo extra.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await exigirUsuario();
    const { id } = await params;
    const cobrar = !ehAdmin(user);

    const extracao = await prisma.extraction.findFirst({
      where: { id, userId: user.id },
      include: { research: true },
    });
    if (!extracao) {
      return NextResponse.json({ error: "Extração não encontrada." }, { status: 404 });
    }

    const alievi = criarAlieviService();
    let alieviExtractionId = extracao.alieviExtractionId;

    // Sem o ID remoto, tenta reencontrar pela pesquisa.
    if (!alieviExtractionId) {
      if (!extracao.research.alieviResearchId) {
        throw new Error(
          "Esta pesquisa não está registrada no serviço, então não há extração para recuperar."
        );
      }

      const usados = (
        await prisma.extraction.findMany({
          where: {
            researchId: extracao.researchId,
            alieviExtractionId: { not: null },
          },
          select: { alieviExtractionId: true },
        })
      ).map((e) => e.alieviExtractionId as string);

      alieviExtractionId = await reencontrarNoServico({
        alieviResearchId: extracao.research.alieviResearchId,
        leadsRequested: extracao.leadsRequested,
        criadaEm: extracao.createdAt,
        alievi,
        idsJaUsados: usados,
      });

      if (!alieviExtractionId) {
        return NextResponse.json({
          extracao: extracaoPublica(extracao),
          status: "nao_encontrada",
          aviso:
            "Não encontramos essa extração no serviço. Ela pode ainda estar processando — tente de novo em alguns minutos.",
        });
      }
    }

    const status = await alievi.statusExtracao(alieviExtractionId);

    if (status === "completed") {
      const { entregues, cobrado } = await concluirExtracao({
        extracao,
        alieviExtractionId,
        alievi,
        cobrar,
      });

      const atualizada = await prisma.extraction.findUniqueOrThrow({
        where: { id: extracao.id },
        include: { _count: { select: { leads: true } } },
      });

      return NextResponse.json({
        extracao: extracaoPublica(atualizada),
        status: "completed",
        entregues,
        creditosDebitados: cobrado,
      });
    }

    if (status === "failed" || status === "error") {
      await falharExtracao(extracao, cobrar);
      return NextResponse.json({
        status: "failed",
        aviso: "O serviço marcou esta extração como falha. Os créditos foram devolvidos.",
      });
    }

    // Guarda o ID reencontrado mesmo sem ter concluído, para o próximo clique.
    if (extracao.alieviExtractionId !== alieviExtractionId) {
      await prisma.extraction.update({
        where: { id: extracao.id },
        data: { alieviExtractionId, status: "processing" },
      });
    }

    return NextResponse.json({
      status: "processing",
      aviso: "A extração ainda está sendo processada. Tente novamente em instantes.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}
