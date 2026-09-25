import { prisma } from "./prisma";
import { regiaoDeFiltro } from "./publico";

export interface LinhaHistorico {
  id: string;
  createdAt: string;
  status: string;
  leadsRequested: number;
  leadsEntregues: number;
  creditsCharged: number;
  pesquisaId: string;
  pesquisaNome: string;
  cnae: string;
  regiao: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
}

export interface ResumoHistorico {
  totalExtracoes: number;
  totalLeads: number;
  totalCreditos: number;
  /** Reservados numa extração que ainda não terminou. */
  creditosEmAberto: number;
}

/**
 * Histórico de consumo por extração.
 * Sem `userId` traz todas as contas — só o admin chama assim.
 */
export async function carregarHistorico(userId?: string): Promise<{
  linhas: LinhaHistorico[];
  resumo: ResumoHistorico;
}> {
  const extracoes = await prisma.extraction.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      research: {
        select: { id: true, name: true, cnae: true, state: true, municipioNome: true },
      },
      _count: { select: { leads: true } },
    },
  });

  const linhas: LinhaHistorico[] = extracoes.map((e) => ({
    id: e.id,
    createdAt: e.createdAt.toISOString(),
    status: e.status,
    leadsRequested: e.leadsRequested,
    leadsEntregues: e._count.leads,
    creditsCharged: e.creditsCharged,
    pesquisaId: e.research.id,
    pesquisaNome: e.research.name,
    cnae: e.research.cnae,
    regiao: regiaoDeFiltro(e.research),
    usuarioId: e.user.id,
    usuarioNome: e.user.name,
    usuarioEmail: e.user.email,
  }));

  return {
    linhas,
    resumo: {
      totalExtracoes: linhas.length,
      totalLeads: linhas.reduce((s, l) => s + l.leadsEntregues, 0),
      // Concluídas: o que de fato saiu do saldo.
      totalCreditos: linhas
        .filter((l) => l.status === "completed")
        .reduce((s, l) => s + l.creditsCharged, 0),
      creditosEmAberto: linhas
        .filter((l) => l.status === "processing")
        .reduce((s, l) => s + l.creditsCharged, 0),
    },
  };
}
