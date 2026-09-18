import { redirect } from "next/navigation";
import { ehAdmin, usuarioAtual } from "@/lib/auth";
import { carregarPainelAdmin } from "@/lib/admin";
import Cabecalho from "../components/Cabecalho";
import PainelAdmin from "../components/PainelAdmin";

export const dynamic = "force-dynamic";

export default async function PaginaAdmin() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  // Usuário comum que digitar /admin volta para as próprias pesquisas.
  if (!ehAdmin(usuario)) redirect("/dashboard");

  const painel = await carregarPainelAdmin();

  return (
    <>
      <Cabecalho usuario={usuario} creditos={painel.resumo.saldoConta} />
      <PainelAdmin {...painel} adminId={usuario.id} />
    </>
  );
}
