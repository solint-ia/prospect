import { notFound, redirect } from "next/navigation";
import { ehAdmin, usuarioAtual } from "@/lib/auth";
import { creditosExibidos } from "@/lib/creditos";
import { prisma } from "@/lib/prisma";
import Cabecalho from "../../components/Cabecalho";
import DetalhePesquisa, {
  type PesquisaDetalhe,
} from "../../components/DetalhePesquisa";

export const dynamic = "force-dynamic";

export default async function PaginaPesquisa({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");

  const { id } = await params;

  // O userId no where impede abrir a pesquisa de outra conta pela URL.
  const pesquisa = await prisma.research.findFirst({
    where: { id, userId: usuario.id },
    include: {
      extractions: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { leads: true } } },
      },
    },
  });

  if (!pesquisa) notFound();

  const creditos = await creditosExibidos(usuario);

  const detalhe: PesquisaDetalhe = {
    id: pesquisa.id,
    name: pesquisa.name,
    cnae: pesquisa.cnae,
    state: pesquisa.state,
    capitalMin: pesquisa.capitalMin,
    capitalMax: pesquisa.capitalMax,
    estimatedLeads: pesquisa.estimatedLeads,
    estimatedCompanies: pesquisa.estimatedCompanies,
    podeExtrair: Boolean(pesquisa.alieviResearchId),
    createdAt: pesquisa.createdAt.toISOString(),
    extracoes: pesquisa.extractions.map((e) => ({
      id: e.id,
      leadsRequested: e.leadsRequested,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
      totalLeads: e._count.leads,
    })),
  };

  return (
    <>
      <Cabecalho usuario={usuario} creditos={creditos} />
      <DetalhePesquisa
        pesquisa={detalhe}
        creditos={creditos}
        ehAdmin={ehAdmin(usuario)}
      />
    </>
  );
}
