import { redirect } from "next/navigation";
import { ehAdmin, usuarioAtual } from "@/lib/auth";
import { creditosExibidos } from "@/lib/creditos";
import { carregarHistorico } from "@/lib/historico";
import Cabecalho from "../components/Cabecalho";
import PainelCreditos from "../components/PainelCreditos";

export const dynamic = "force-dynamic";

export default async function PaginaCreditos() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");

  const admin = ehAdmin(usuario);

  const [historico, creditos] = await Promise.all([
    // Sem userId o histórico vem de todas as contas — só para o admin.
    carregarHistorico(admin ? undefined : usuario.id),
    creditosExibidos(usuario),
  ]);

  return (
    <>
      <Cabecalho usuario={usuario} creditos={creditos} />
      <PainelCreditos
        linhas={historico.linhas}
        resumo={historico.resumo}
        ehAdmin={admin}
        saldoAtual={creditos}
      />
    </>
  );
}
