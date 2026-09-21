"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, LogIn, UserPlus } from "lucide-react";
import CampoSenha from "../components/CampoSenha";

type Modo = "login" | "cadastro";
type RespostaAuth = { error?: string };

const inputCls =
  "h-11 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3.5 text-[15px] text-slate-100 shadow-inner shadow-black/10 placeholder:text-slate-500 transition duration-200 focus:border-emerald-400/50 focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-emerald-400/15";

async function lerRespostaAuth(res: Response): Promise<RespostaAuth> {
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      "O servidor retornou uma resposta inesperada. Recarregue a página e tente novamente."
    );
  }

  try {
    return (await res.json()) as RespostaAuth;
  } catch {
    throw new Error(
      "Não foi possível interpretar a resposta do servidor. Tente novamente."
    );
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [modo, setModo] = useState<Modo>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ehCadastro = modo === "cadastro";

  function trocarModo() {
    setModo(ehCadastro ? "login" : "cadastro");
    setErro(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setErro(null);

    try {
      const rota = ehCadastro ? "/api/auth/register" : "/api/auth/login";
      const corpo = ehCadastro ? { name, email, password } : { email, password };

      const res = await fetch(rota, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const data = await lerRespostaAuth(res);
      if (!res.ok) throw new Error(data.error ?? "Não foi possível entrar.");

      // O cookie já veio na resposta; refresh para o proxy liberar a rota.
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
      setEnviando(false);
    }
  }

  return (
    <main
      className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-8 sm:py-10"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 6, 23, 0.32), rgba(2, 6, 23, 0.5)), url('/login-network-background.png')",
      }}
    >
      <div className="relative z-10 w-full max-w-[400px] sm:-translate-y-2">
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold uppercase leading-none tracking-[0.18em] text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.28)] sm:text-[40px]">
            Prospect
          </h1>
          <p className="mt-3 text-base font-medium tracking-[-0.015em] text-slate-100 sm:text-lg">
            Extrator de Leads B2B
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-slate-400 sm:text-sm">
            {ehCadastro
              ? "Crie sua conta e ganhe 1.000 créditos."
              : "Entre para acessar suas pesquisas."}
          </p>
        </div>

        <form
          onSubmit={enviar}
          className="rounded-[24px] border border-emerald-200/10 bg-[#020817]/80 p-5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85),0_0_48px_-28px_rgba(16,185,129,0.45)] backdrop-blur-xl sm:p-7"
        >
          <div className="space-y-4.5">
            {ehCadastro && (
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-slate-300">
                  Nome
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Seu nome"
                  className={inputCls}
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-[13px] font-medium text-slate-300">
                E-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="voce@empresa.com"
                className={inputCls}
              />
            </label>

            <CampoSenha
              label="Senha"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
              autoComplete={ehCadastro ? "new-password" : "current-password"}
              placeholder="••••••••"
              className={inputCls}
              dica={
                ehCadastro ? (
                  <span className="mt-1.5 block text-xs text-slate-500">
                    Mínimo de 6 caracteres
                  </span>
                ) : undefined
              }
            />
          </div>

          {erro && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-6 text-[15px] font-semibold text-slate-950 shadow-lg shadow-emerald-950/25 transition duration-200 hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
          >
            {enviando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : ehCadastro ? (
              <UserPlus className="h-5 w-5" />
            ) : (
              <LogIn className="h-5 w-5" />
            )}
            {ehCadastro ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className="mt-4.5 text-center text-[13px] text-slate-400">
          {ehCadastro ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
          <button
            type="button"
            onClick={trocarModo}
            className="font-medium text-emerald-400 transition hover:text-emerald-300"
          >
            {ehCadastro ? "Entrar" : "Criar agora"}
          </button>
        </p>
      </div>
    </main>
  );
}
