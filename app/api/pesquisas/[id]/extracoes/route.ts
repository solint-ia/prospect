import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ehAdmin, exigirUsuario } from "@/lib/auth";
import { criarAlieviService } from "@/lib/alievi";
import {
  estornarCreditos,
  invalidarSaldoAlievi,
  reservarCreditos,
} from "@/lib/creditos";
import { normalizarLead } from "@/lib/leads";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";
import { extracaoPublica } from "@/lib/publico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Roda a extração na Alievi e persiste os leads.
 *
 * Créditos (1 lead = 1 crédito):
 * - usuário: reserva o pedido antes, debita só o que chegou e estorna o resto;
 * - admin: não mexe no banco — quem desconta é a própria Alievi, do saldo dela.
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

    // Antes de tocar na Alievi: sem saldo, nem começa.
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

    try {
      const { extractionId, leads } = await criarAlieviService().extrairDaPesquisa(
        pesquisa.alieviResearchId,
        leadsRequested
      );

      // A Alievi pode entregar menos que o pedido (ex.: pediu 10, vieram 7).
      const entregues = Math.min(leads.length, leadsRequested);
      const cobrado = cobrar ? entregues : 0;

      const [, finalizada] = await prisma.$transaction([
        prisma.lead.createMany({
          data: leads.map((l) => {
            const { phonesJson, emailsJson, ...campos } = normalizarLead(l);
            return {
              extractionId: extracao.id,
              ...campos,
              // O Json do Prisma não aceita interfaces diretamente (sem index signature).
              phonesJson: phonesJson as unknown as Prisma.InputJsonValue,
              emailsJson: emailsJson as unknown as Prisma.InputJsonValue,
            };
          }),
        }),
        prisma.extraction.update({
          where: { id: extracao.id },
          data: {
            status: "completed",
            alieviExtractionId: extractionId,
            creditsCharged: cobrado,
          },
          include: { _count: { select: { leads: true } } },
        }),
        ...(cobrar && leadsRequested > entregues
          ? [
              prisma.user.update({
                where: { id: user.id },
                data: { credits: { increment: leadsRequested - entregues } },
              }),
            ]
          : []),
      ]);

      invalidarSaldoAlievi();
      return NextResponse.json({
        extracao: extracaoPublica(finalizada),
        creditosDebitados: cobrado,
      });
    } catch (erroExtracao) {
      // Falhou: nada foi entregue, então nada é cobrado.
      await prisma.extraction.update({
        where: { id: extracao.id },
        data: { status: "failed", creditsCharged: 0 },
      });
      if (cobrar) await estornarCreditos(user.id, leadsRequested);
      throw erroExtracao;
    }
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}
