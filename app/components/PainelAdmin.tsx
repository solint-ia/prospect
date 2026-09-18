"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Coins,
  Loader2,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  TrendingDown,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { UsuarioAdmin } from "@/lib/admin";
import { dataCurta, num } from "./ui";
import Paginacao from "./Paginacao";

interface Resumo {
  saldoConta: number | null;
  distribuidos: number;
  consumidos: number;
  totalUsuarios: number;
}

function Metrica({
  icone,
  rotulo,
  valor,
  detalhe,
  destaque = false,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        destaque
          ? "border-emerald-400/25 bg-emerald-400/5"
          : "border-white/10 bg-slate-950/60"
      }`}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {icone}
        {rotulo}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-white">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
}

/** Edição inline do saldo: o botão só aparece quando o valor muda. */
function EditorCreditos({
  usuario,
  onSalvo,
}: {
  usuario: UsuarioAdmin;
  onSalvo: (msg: string) => void;
}) {
  const [valor, setValor] = useState(String(usuario.credits));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Depois do router.refresh() o saldo vindo do servidor pode ter mudado.
  useEffect(() => setValor(String(usuario.credits)), [usuario.credits]);

  const numero = Number(valor);
  const alterado = valor !== "" && numero !== usuario.credits;
  const valido = valor !== "" && Number.isInteger(numero) && numero >= 0;

  async function salvar() {
    if (!alterado || !valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: numero }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar.");
      onSalvo(
        `Créditos de ${usuario.name}: ${num(usuario.credits)} → ${num(numero)}.`
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          step={1}
          value={valor}
          disabled={salvando}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") salvar();
            if (e.key === "Escape") setValor(String(usuario.credits));
          }}
          aria-label={`Créditos de ${usuario.name}`}
          className={`w-28 rounded-lg border bg-white/5 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-white transition focus:outline-none focus:ring-1 ${
            alterado
              ? "border-amber-400/50 focus:ring-amber-400/40"
              : "border-white/10 focus:border-emerald-400/50 focus:ring-emerald-400/40"
          }`}
        />
        {alterado && (
          <>
            <button
              type="button"
              onClick={salvar}
              disabled={!valido || salvando}
              title="Salvar (Enter)"
              className="rounded-lg bg-emerald-500 p-1.5 text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
            >
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setValor(String(usuario.credits))}
              disabled={salvando}
              title="Descartar (Esc)"
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="mt-1.5 flex gap-1">
        {[100, 500, 1000].map((n) => (
          <button
            key={n}
            type="button"
            disabled={salvando}
            onClick={() => setValor(String((Number(valor) || 0) + n))}
            className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:border-emerald-400/40 hover:text-emerald-300"
          >
            +{num(n)}
          </button>
        ))}
      </div>

      {erro && <p className="mt-1 text-xs text-rose-400">{erro}</p>}
    </div>
  );
}

function ModalNovoUsuario({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !salvando) onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar, salvando]);

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    if (salvando) return;

    setSalvando(true);
    setErro(null);

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const ehJson = (res.headers.get("content-type") ?? "").includes(
        "application/json"
      );
      const data = ehJson ? ((await res.json()) as { error?: string }) : {};

      if (!res.ok) {
        throw new Error(data.error ?? `Não foi possível criar a conta (HTTP ${res.status}).`);
      }

      onCriado(`Conta de ${name.trim()} criada com 1.000 créditos.`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível criar a conta.");
      setSalvando(false);
    }
  }

  const campoCls =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !salvando) onFechar();
      }}
    >
      <form
        onSubmit={criar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-novo-usuario"
        className="my-auto w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/60"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="titulo-novo-usuario" className="text-xl font-semibold text-white">
              Novo usuário
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              A conta será criada com 1.000 créditos iniciais.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            title="Fechar"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">Nome</span>
            <input
              autoFocus
              required
              autoComplete="name"
              value={name}
              onChange={(evento) => setName(evento.target.value)}
              disabled={salvando}
              placeholder="Nome do usuário"
              className={campoCls}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              disabled={salvando}
              placeholder="usuario@empresa.com"
              className={campoCls}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">Senha</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              disabled={salvando}
              placeholder="Mínimo de 6 caracteres"
              className={campoCls}
            />
          </label>
        </div>

        {erro && (
          <p className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {salvando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {salvando ? "Criando conta..." : "Criar usuário"}
        </button>
      </form>
    </div>
  );
}

function ModalExcluir({
  usuario,
  onFechar,
  onExcluido,
}: {
  usuario: UsuarioAdmin;
  onFechar: () => void;
  onExcluido: (msg: string) => void;
}) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    setExcluindo(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao excluir.");
      onExcluido(`Conta de ${usuario.name} excluída.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao excluir.");
      setExcluindo(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !excluindo) onFechar();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-slate-950 p-6 shadow-2xl shadow-black/60"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="shrink-0 rounded-lg bg-rose-500/10 p-2 text-rose-400">
            <Trash2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Excluir conta?</h2>
            <p className="mt-1 text-sm text-slate-400">
              <strong className="text-white">{usuario.name}</strong> ({usuario.email})
            </p>
          </div>
        </div>

        <p className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3.5 py-3 text-sm text-rose-200">
          Isso apaga de forma permanente {num(usuario.pesquisas)}{" "}
          {usuario.pesquisas === 1 ? "pesquisa" : "pesquisas"},{" "}
          {num(usuario.extracoes)}{" "}
          {usuario.extracoes === 1 ? "extração" : "extrações"} e todos os leads
          dessa conta. Os {num(usuario.credits)} créditos restantes também somem.
        </p>

        {erro && <p className="mt-3 text-sm text-rose-400">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onFechar}
            disabled={excluindo}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={excluir}
            disabled={excluindo}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
          >
            {excluindo && <Loader2 className="h-4 w-4 animate-spin" />}
            Excluir conta
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PainelAdmin({
  usuarios,
  resumo,
  adminId,
}: {
  usuarios: UsuarioAdmin[];
  resumo: Resumo;
  adminId: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [campoBusca, setCampoBusca] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [aviso, setAviso] = useState<string | null>(null);
  const [alterandoPerfil, setAlterandoPerfil] = useState<string | null>(null);
  const [paraExcluir, setParaExcluir] = useState<UsuarioAdmin | null>(null);
  const [modalNovoUsuario, setModalNovoUsuario] = useState(false);

  const filtrados = useMemo(() => {
    const t = busca
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
    if (!t) return usuarios;
    return usuarios.filter((usuario) => {
      const campos: Record<string, string> = {
        nome: usuario.name,
        email: usuario.email,
        perfil: usuario.role === "admin" ? "administrador admin" : "usuario usuário",
      };
      const valores = campoBusca === "todos" ? Object.values(campos) : [campos[campoBusca]];
      return valores.some((valor) =>
        (valor ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(t)
      );
    });
  }, [usuarios, busca, campoBusca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const usuariosDaPagina = filtrados.slice(
    (pagina - 1) * porPagina,
    pagina * porPagina
  );

  useEffect(() => setPagina(1), [busca, campoBusca, porPagina]);

  useEffect(() => {
    setPagina((atual) => Math.min(atual, totalPaginas));
  }, [totalPaginas]);

  function concluido(msg: string) {
    setAviso(msg);
    setParaExcluir(null);
    setModalNovoUsuario(false);
    router.refresh();
  }

  async function alternarPerfil(u: UsuarioAdmin) {
    const novo = u.role === "admin" ? "user" : "admin";
    setAlterandoPerfil(u.id);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: novo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao alterar o perfil.");
      concluido(
        novo === "admin"
          ? `${u.name} agora é administrador.`
          : `${u.name} voltou a ser usuário comum.`
      );
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Falha ao alterar o perfil.");
    } finally {
      setAlterandoPerfil(null);
    }
  }

  // Mais crédito distribuído do que a conta tem de verdade.
  const excedente =
    resumo.saldoConta !== null && resumo.distribuidos > resumo.saldoConta
      ? resumo.distribuidos - resumo.saldoConta
      : 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <ShieldCheck className="h-7 w-7 text-amber-400" />
            Administração
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Gerencie as contas e distribua os créditos da conta entre os
            usuários.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNovoUsuario(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <UserPlus className="h-4 w-4" />
          Novo usuário
        </button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          destaque
          icone={<Wallet className="h-3.5 w-3.5" />}
          rotulo="Saldo da conta"
          valor={resumo.saldoConta === null ? "—" : num(resumo.saldoConta)}
          detalhe={
            resumo.saldoConta === null
              ? "Saldo indisponível no momento"
              : "Saldo real da conta"
          }
        />
        <Metrica
          icone={<Coins className="h-3.5 w-3.5" />}
          rotulo="Distribuídos"
          valor={num(resumo.distribuidos)}
          detalhe="Soma dos saldos dos usuários"
        />
        <Metrica
          icone={<TrendingDown className="h-3.5 w-3.5" />}
          rotulo="Consumidos"
          valor={num(resumo.consumidos)}
          detalhe="Leads entregues aos usuários"
        />
        <Metrica
          icone={<Users className="h-3.5 w-3.5" />}
          rotulo="Contas"
          valor={num(resumo.totalUsuarios)}
        />
      </div>

      {excedente > 0 && (
        <p className="mb-6 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Os usuários têm {num(excedente)} créditos a mais do que a conta
            possui. Se todos gastarem o saldo, as extrações vão falhar.
          </span>
        </p>
      )}

      {aviso && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            {aviso}
          </span>
          <button
            type="button"
            onClick={() => setAviso(null)}
            className="text-emerald-300/70 hover:text-emerald-200"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-slate-950/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <p className="text-sm font-medium text-white">
            {num(filtrados.length)}{" "}
            {filtrados.length === 1 ? "conta" : "contas"}
          </p>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Busca rápida..."
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
              />
            </div>

            <select
              value={campoBusca}
              onChange={(evento) => setCampoBusca(evento.target.value)}
              aria-label="Campo da busca de usuários"
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:border-emerald-400/40 focus:outline-none"
            >
              <option value="todos">Todos os campos</option>
              <option value="nome">Nome</option>
              <option value="email">E-mail</option>
              <option value="perfil">Perfil</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-500">
              Exibir
              <select
                value={porPagina}
                onChange={(evento) => setPorPagina(Number(evento.target.value))}
                className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-sm text-slate-300 focus:border-emerald-400/40 focus:outline-none"
              >
                {[10, 25, 50].map((quantidade) => (
                  <option key={quantidade} value={quantidade}>
                    {quantidade}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {["Conta", "Perfil", "Créditos", "Uso", "Criada em", ""].map((c) => (
                  <th
                    key={c}
                    className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuariosDaPagina.map((u) => {
                const souEu = u.id === adminId;
                const admin = u.role === "admin";

                return (
                  <tr
                    key={u.id}
                    className="border-b border-white/5 align-top last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {u.name}
                        {souEu && (
                          <span className="ml-1.5 text-xs font-normal text-slate-500">
                            (você)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>

                    <td className="px-4 py-3">
                      {admin ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                          <ShieldCheck className="h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                          Usuário
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {admin ? (
                        <p className="text-xs leading-snug text-slate-500">
                          Usa o saldo
                          <br />
                          da conta
                        </p>
                      ) : (
                        <EditorCreditos usuario={u} onSalvo={concluido} />
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-400">
                      <p>
                        <span className="font-semibold tabular-nums text-slate-200">
                          {num(u.consumidos)}
                        </span>{" "}
                        créditos consumidos
                      </p>
                      <p className="mt-0.5">
                        {num(u.pesquisas)} pesquisas · {num(u.extracoes)} extrações
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                      {dataCurta(u.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => alternarPerfil(u)}
                          disabled={souEu || alterandoPerfil === u.id}
                          title={
                            souEu
                              ? "Você não pode alterar o próprio perfil"
                              : admin
                                ? "Remover acesso de admin"
                                : "Tornar admin"
                          }
                          className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-amber-400/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {alterandoPerfil === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : admin ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setParaExcluir(u)}
                          disabled={souEu}
                          title={souEu ? "Você não pode excluir a própria conta" : "Excluir conta"}
                          className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-rose-500/40 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nenhuma conta encontrada para &ldquo;{busca}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Paginacao
          pagina={pagina}
          totalPaginas={totalPaginas}
          totalItens={filtrados.length}
          porPagina={porPagina}
          onMudar={setPagina}
        />
      </div>

      {paraExcluir && (
        <ModalExcluir
          usuario={paraExcluir}
          onFechar={() => setParaExcluir(null)}
          onExcluido={concluido}
        />
      )}

      {modalNovoUsuario && (
        <ModalNovoUsuario
          onFechar={() => setModalNovoUsuario(false)}
          onCriado={concluido}
        />
      )}
    </main>
  );
}
