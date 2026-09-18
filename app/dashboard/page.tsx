import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { creditosExibidos } from "@/lib/creditos";
import { prisma } from "@/lib/prisma";
import Cabecalho from "../components/Cabecalho";
import PainelPesquisas, { type PesquisaCard } from "../components/PainelPesquisas";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");

  const [pesquisas, creditos] = await Promise.all([
    prisma.research.findMany({
      where: { userId: usuario.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { extractions: true } } },
    }),
    creditosExibidos(usuario),
  ]);

  // O componente é client: serializa as datas antes de atravessar a fronteira.
  const cards: PesquisaCard[] = pesquisas.map((p) => ({
    id: p.id,
    name: p.name,
    cnae: p.cnae,
    state: p.state,
    estimatedLeads: p.estimatedLeads,
    estimatedCompanies: p.estimatedCompanies,
    podeExtrair: Boolean(p.alieviResearchId),
    extracoes: p._count.extractions,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <>
      <Cabecalho usuario={usuario} creditos={creditos} />
      <PainelPesquisas iniciais={cards} />
    </>
  );
}
