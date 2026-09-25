import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { AlieviService } from "./alievi";
import {
  estornarCreditos,
  invalidarSaldoAlievi,
  reservarCreditos,
} from "./creditos";
import { normalizarLead } from "./leads";

/**
 * Quanto tempo a requisição espera a extração terminar antes de devolver o
 * controle. Fica abaixo do maxDuration da rota para sobrar margem de resposta;
 * o que passar disso continua rodando no serviço e é recuperado pelo botão de
 * sincronizar.
 */
export const LIMITE_ESPERA_MS = 230_000;

interface ExtracaoDoBanco {
  id: string;
  userId: string;
  leadsRequested: number;
  creditsCharged: number;
}

/**
 * Baixa os leads de uma extração já concluída no serviço, grava e acerta os
 * créditos. É idempotente: reimportar a mesma extração não duplica leads nem
 * cobra duas vezes.
 */
export async function concluirExtracao({
  extracao,
  alieviExtractionId,
  alievi,
  cobrar,
}: {
  extracao: ExtracaoDoBanco;
  alieviExtractionId: string;
  alievi: AlieviService;
  cobrar: boolean;
}): Promise<{ entregues: number; cobrado: number }> {
  const leads = await alievi.baixarLeads(alieviExtractionId);

  // O serviço pode entregar menos que o pedido (ex.: pediu 10, vieram 7).
  const entregues = Math.min(leads.length, extracao.leadsRequested);
  const cobrado = cobrar ? entregues : 0;

  // Acerta a diferença entre o que já estava reservado e o que foi entregue.
  const diferenca = cobrado - extracao.creditsCharged;
  if (diferenca > 0) await reservarCreditos(extracao.userId, diferenca);
  if (diferenca < 0) await estornarCreditos(extracao.userId, -diferenca);

  await prisma.$transaction([
    // Apaga antes de inserir: assim sincronizar duas vezes não duplica.
    prisma.lead.deleteMany({ where: { extractionId: extracao.id } }),
    prisma.lead.createMany({
      data: leads.map((l) => {
        const { phonesJson, emailsJson, ...campos } = normalizarLead(l);
        return {
          extractionId: extracao.id,
          ...campos,
          // O Json do Prisma não aceita interfaces (sem index signature).
          phonesJson: phonesJson as unknown as Prisma.InputJsonValue,
          emailsJson: emailsJson as unknown as Prisma.InputJsonValue,
        };
      }),
    }),
    prisma.extraction.update({
      where: { id: extracao.id },
      data: {
        status: "completed",
        alieviExtractionId,
        creditsCharged: cobrado,
      },
    }),
  ]);

  invalidarSaldoAlievi();
  return { entregues, cobrado };
}

/** Marca como falha e devolve tudo que estava reservado. */
export async function falharExtracao(
  extracao: ExtracaoDoBanco,
  cobrar: boolean
): Promise<void> {
  await prisma.extraction.update({
    where: { id: extracao.id },
    data: { status: "failed", creditsCharged: 0 },
  });

  if (cobrar && extracao.creditsCharged > 0) {
    await estornarCreditos(extracao.userId, extracao.creditsCharged);
  }
}

/**
 * Reencontra a extração no serviço quando o ID não chegou a ser guardado —
 * o caso de uma requisição que morreu antes de registrar a resposta.
 * Casa pela quantidade pedida e pela proximidade no tempo, ignorando as que
 * já pertencem a outra extração nossa.
 */
export async function reencontrarNoServico({
  alieviResearchId,
  leadsRequested,
  criadaEm,
  alievi,
  idsJaUsados,
}: {
  alieviResearchId: string;
  leadsRequested: number;
  criadaEm: Date;
  alievi: AlieviService;
  idsJaUsados: string[];
}): Promise<string | null> {
  const remotas = await alievi.listarExtracoes(alieviResearchId);

  const candidatas = remotas
    .filter((e) => !idsJaUsados.includes(e.id))
    .filter((e) => e.status === "completed")
    .filter((e) => e.leadsCount === leadsRequested)
    .map((e) => ({
      id: e.id,
      distanciaMs: Math.abs(new Date(e.createdAt).getTime() - criadaEm.getTime()),
    }))
    .sort((a, b) => a.distanciaMs - b.distanciaMs);

  // Meia hora de folga: mais que isso já não é a mesma tentativa.
  const perto = candidatas.find((c) => c.distanciaMs < 30 * 60 * 1000);
  return perto?.id ?? null;
}
