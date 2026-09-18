import { prisma } from "./prisma";
import { saldoAlievi } from "./creditos";

export interface UsuarioAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  credits: number;
  pesquisas: number;
  extracoes: number;
  consumidos: number;
  createdAt: string;
}

/** Lista as contas com os números de uso e o panorama de créditos. */
export async function carregarPainelAdmin() {
  const [usuarios, consumoPorUsuario, saldoConta] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        credits: true,
        createdAt: true,
        _count: { select: { researches: true, extractions: true } },
      },
    }),
    prisma.extraction.groupBy({
      by: ["userId"],
      _sum: { creditsCharged: true },
    }),
    saldoAlievi().catch(() => null),
  ]);

  const consumo = new Map(
    consumoPorUsuario.map((c) => [c.userId, c._sum.creditsCharged ?? 0])
  );

  const lista: UsuarioAdmin[] = usuarios.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    credits: u.credits,
    pesquisas: u._count.researches,
    extracoes: u._count.extractions,
    consumidos: consumo.get(u.id) ?? 0,
    createdAt: u.createdAt.toISOString(),
  }));

  // Saldo do admin é o da Alievi; só o dos usuários comuns é "distribuído".
  const comuns = lista.filter((u) => u.role !== "admin");

  return {
    usuarios: lista,
    resumo: {
      saldoConta,
      distribuidos: comuns.reduce((s, u) => s + u.credits, 0),
      consumidos: lista.reduce((s, u) => s + u.consumidos, 0),
      totalUsuarios: lista.length,
    },
  };
}
