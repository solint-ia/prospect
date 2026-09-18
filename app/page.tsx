import { redirect } from "next/navigation";

/** O middleware já barra quem não tem sessão; aqui só encaminhamos. */
export default function Home() {
  redirect("/dashboard");
}
