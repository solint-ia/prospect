import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ehAdmin, exigirUsuario } from "@/lib/auth";
import { criarAlieviService } from "@/lib/alievi";
import { reservarCreditos } from "@/lib/creditos";
import {
  LIMITE_ESPERA_MS,
  concluirExtracao,
  falharExtracao,
} from "@/lib/extracao";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";
import { extracaoPublica } from "@/lib/publico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Dispara a extração e espera até LIMITE_ESPERA_MS.
 *
 * Se o serviço demorar mais que isso, a extração fica em "processing" com o ID
 * remoto já gravado — o botão de sincronizar recupera os leads depois, sem
 * gastar nada de novo. Os créditos seguem reservados nesse intervalo.
 *
 * Créditos (1 lead = 1 crédito):
 * - usuário: reserva o pedido antes, debita só o que chegou e estorna o resto;
 * - admin: não mexe no banco — quem desconta é o próprio serviço.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await exigirUsuario();
    const { id } = await params;
    const cobrar = !ehAdmin(user);

    const leadsRequested = Number((await req.json())?.leadsCount ?? 0);
    if (!Number.isInteger(leadsRequested) || leadsRequested < 1) {
      throw new Error("Quantidade de leads inválida.");
    }

    const pesquisa = await prisma.research.findFirst({
      where: { id, userId: user.id },
    });
    if (!pesquisa) {
      return NextResponse.json({ error: "Pesquisa não encontrada." }, { status: 404 });
    }
    if (!pesquisa.alieviResearchId) {
      throw new Error(
        "Esta pesquisa não foi concluída na criação. Crie a pesquisa novamente."
      );
    }

    // Antes de tocar no serviço: sem saldo, nem começa.
    if (cobrar) await reservarCreditos(user.id, leadsRequested);

    const extracao = await prisma.extraction.create({
      data: {
        researchId: pesquisa.id,
        userId: user.id,
        leadsRequested,
        creditsCharged: cobrar ? leadsRequested : 0,
        status: "processing",
      },
    });

    const alievi = criarAlieviService();

    let alieviExtractionId: string;
    try {
      alieviExtractionId = await alievi.iniciarExtracao(
        pesquisa.alieviResearchId,
        leadsRequested
      );
    } catch (erroInicio) {
      // Nem começou no serviço: não há o que recuperar depois.
      await falharExtracao(extracao, cobrar);
      throw erroInicio;
    }

    // Guardar o ID agora é o que torna a extração recuperável mais tarde.
    await prisma.extraction.update({
      where: { id: extracao.id },
      data: { alieviExtractionId },
    });

    const status = await alievi.aguardarConclusao(
      alieviExtractionId,
      LIMITE_ESPERA_MS
    );

    if (status === "completed") {
      const { cobrado } = await concluirExtracao({
        extracao,
        alieviExtractionId,
        alievi,
        cobrar,
      });

      const finalizada = await prisma.extraction.findUniqueOrThrow({
        where: { id: extracao.id },
        include: { _count: { select: { leads: true } } },
      });

      return NextResponse.json({
        extracao: extracaoPublica(finalizada),
        creditosDebitados: cobrado,
      });
    }

    if (status === "failed" || status === "error") {
      await falharExtracao(extracao, cobrar);
      throw new Error("A extração falhou no serviço de dados.");
    }

    // Ainda rodando: devolve o controle e deixa para o sincronizar.
    const pendente = await prisma.extraction.findUniqueOrThrow({
      where: { id: extracao.id },
      include: { _count: { select: { leads: true } } },
    });

    return NextResponse.json(
      {
        extracao: extracaoPublica(pendente),
        emAndamento: true,
        aviso:
          "A extração está demorando mais que o normal e continua rodando. Use o botão de atualizar na lista de extrações para buscar os leads quando terminar.",
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}
