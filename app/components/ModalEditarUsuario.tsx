"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, KeyRound, Loader2, X } from "lucide-react";
import type { UsuarioAdmin } from "@/lib/admin";
import CampoSenha from "./CampoSenha";

const campoCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-60";

const SENHA_MINIMA = 6;

export default function ModalEditarUsuario({
  usuario,
  souEu,
  onFechar,
  onSalvo,
}: {
  usuario: UsuarioAdmin;
  souEu: boolean;
  onFechar: () => void;
  onSalvo: (msg: string) => void;
}) {
  const [name, setName] = useState(usuario.name);
  const [email, setEmail] = useState(usuario.email);
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !salvando) onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar, salvando]);

  const nomeMudou = name.trim() !== usuario.name;
  const emailMudou = email.trim().toLowerCase() !== usuario.email;
  const querTrocarSenha = password !== "";
  const senhasBatem = password === confirmacao;
  const algoMudou = nomeMudou || emailMudou || querTrocarSenha;

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (salvando || !algoMudou) return;

    if (querTrocarSenha && !senhasBatem) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }

    setSalvando(true);
    setErro(null);

    // Só vai o que mudou: assim o servidor não revalida e-mail à toa.
    const corpo: Record<string, string> = {};
    if (nomeMudou) corpo.name = name.trim();
    if (emailMudou) corpo.email = email.trim().toLowerCase();
    if (querTrocarSenha) corpo.password = password;

    try {
      const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar.");

      const partes = [
        nomeMudou && "nome",
        emailMudou && "e-mail",
        querTrocarSenha && "senha",
      ].filter(Boolean);

      const sufixo =
        querTrocarSenha && !souEu
          ? " As sessões abertas dessa conta foram encerradas."
          : "";

      onSalvo(
        `${usuario.name}: ${partes.join(", ")} ${
          partes.length > 1 ? "atualizados" : "atualizado"
        }.${sufixo}`
      );
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !salvando) onFechar();
      }}
    >
      <form
        onSubmit={salvar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-editar-usuario"
        className="my-auto w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/60"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="titulo-editar-usuario"
              className="text-xl font-semibold text-white"
            >
              {souEu ? "Editar minha conta" : "Editar conta"}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-400">{usuario.email}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            title="Fechar"
            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">
              Nome
            </span>
            <input
              autoFocus
              required
              autoComplete="name"
              value={name}
              onChange={(evento) => setName(evento.target.value)}
              disabled={salvando}
              className={campoCls}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">
              E-mail
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              disabled={salvando}
              className={campoCls}
            />
            {emailMudou && (
              <span className="mt-1.5 block text-xs text-amber-300">
                {souEu
                  ? "Você passará a entrar com este e-mail."
                  : "O usuário passará a entrar com este e-mail."}
              </span>
            )}
          </label>

          <fieldset className="rounded-xl border border-white/10 p-3.5">
            <legend className="px-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              Trocar senha
            </legend>

            <CampoSenha
              label="Nova senha"
              value={password}
              onChange={setPassword}
              minLength={SENHA_MINIMA}
              autoComplete="new-password"
              disabled={salvando}
              placeholder="Deixe em branco para manter a atual"
              className={campoCls}
            />

            {querTrocarSenha && (
              <div className="mt-3">
                <CampoSenha
                  label="Confirmar nova senha"
                  value={confirmacao}
                  onChange={setConfirmacao}
                  autoComplete="new-password"
                  disabled={salvando}
                  className={campoCls}
                  dica={
                    confirmacao !== "" && !senhasBatem ? (
                      <span className="mt-1.5 block text-xs text-rose-400">
                        As senhas não conferem.
                      </span>
                    ) : undefined
                  }
                />
              </div>
            )}

            {querTrocarSenha && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                <KeyRound className="mt-px h-3 w-3 shrink-0" />
                {souEu
                  ? "Você continua logado; as outras sessões desta conta caem."
                  : "As sessões abertas dessa conta serão encerradas."}
              </p>
            )}
          </fieldset>
        </div>

        {erro && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando || !algoMudou || (querTrocarSenha && !senhasBatem)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alterações
          </button>
        </div>
      </form>
    </div>
  );
}
