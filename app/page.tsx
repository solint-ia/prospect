import { redirect } from "next/navigation";

/** O proxy já barra quem não tem sessão; aqui só encaminhamos. */
export default function Home() {
  redirect("/dashboard");
}
