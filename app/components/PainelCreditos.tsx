"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Coins,
  Download,
  History,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { LinhaHistorico, ResumoHistorico } from "@/lib/historico";
import Paginacao from "./Paginacao";
import { dataHora, num } from "./ui";

function formatarCnae(cod: string): string {
  return cod.length === 7
    ? `${cod.slice(0, 4)}-${cod.slice(4, 5)}/${cod.slice(5)}`
    : cod;
}

function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
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

function Selo({ status }: { status: string }) {
  const mapa: Record<string, { cls: string; texto: string; icone: React.ReactNode }> = {
    completed: {
      cls: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
      texto: "Concluída",
      icone: <CheckCircle2 className="h-3 w-3" />,
    },
    processing: {
      cls: "border-amber-400/25 bg-amber-400/10 text-amber-300",
      texto: "Em aberto",
      icone: <Clock className="h-3 w-3" />,
    },
    failed: {
      cls: "border-rose-400/25 bg-rose-400/10 text-rose-300",
      texto: "Falhou",
      icone: <TriangleAlert className="h-3 w-3" />,
    },
  };
  const s = mapa[status] ?? mapa.processing;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}
    >
      {s.icone}
      {s.texto}
    </span>
  );
}

/** Aspas duplicadas e campo entre aspas: o padrão RFC 4180. */
function celula(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

export default function PainelCreditos({
  linhas,
  resumo,
  ehAdmin,
  saldoAtual,
}: {
  linhas: LinhaHistorico[];
  resumo: ResumoHistorico;
  ehAdmin: boolean;
  /** Admin: saldo da conta. Usuário: saldo dele. Null = indisponível. */
  saldoAtual: number | null;
}) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [usuarioFiltro, setUsuarioFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const porPagina = 25;

  const usuarios = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const l of linhas) mapa.set(l.usuarioId, `${l.usuarioNome} (${l.usuarioEmail})`);
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [linhas]);

  const filtradas = useMemo(() => {
    const termo = semAcento(busca.trim());

    return linhas.filter((l) => {
      if (statusFiltro !== "todos" && l.status !== statusFiltro) return false;
      if (ehAdmin && usuarioFiltro !== "todos" && l.usuarioId !== usuarioFiltro) {
        return false;
      }
      if (!termo) return true;

      const alvo = semAcento(
        [
          l.pesquisaNome,
          l.cnae,
          formatarCnae(l.cnae),
          l.regiao,
          l.usuarioNome,
          l.usuarioEmail,
        ].join(" ")
      );
      return alvo.includes(termo);
    });
  }, [linhas, busca, statusFiltro, usuarioFiltro, ehAdmin]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const daPagina = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  useEffect(() => setPagina(1), [busca, statusFiltro, usuarioFiltro]);
  useEffect(() => {
    setPagina((atual) => Math.min(atual, totalPaginas));
  }, [totalPaginas]);

  // Os totais acompanham o filtro, senão o número do topo não explica a tabela.
  const creditosFiltrados = filtradas
    .filter((l) => l.status === "completed")
    .reduce((s, l) => s + l.creditsCharged, 0);

  function exportarCsv() {
    const colunas = [
      "Data",
      ...(ehAdmin ? ["Usuário", "E-mail"] : []),
      "Pesquisa",
      "CNAE",
      "Região",
      "Leads pedidos",
      "Leads entregues",
      "Créditos",
      "Status",
    ];

    const linhasCsv = filtradas.map((l) =>
      [
        dataHora(l.createdAt),
        ...(ehAdmin ? [l.usuarioNome, l.usuarioEmail] : []),
        l.pesquisaNome,
        formatarCnae(l.cnae),
        l.regiao,
        String(l.leadsRequested),
        String(l.leadsEntregues),
        String(l.creditsCharged),
        l.status,
      ].map(celula).join(";")
    );

    // BOM para o Excel em pt-BR abrir com os acentos certos.
    const csv = "﻿" + [colunas.map(celula).join(";"), ...linhasCsv].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico_creditos_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          <History className="h-7 w-7 text-emerald-400" />
          Histórico de créditos
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {ehAdmin
            ? "Consumo por extração de todas as contas."
            : "Seu consumo por extração. 1 lead entregue = 1 crédito."}
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          destaque
          icone={<Coins className="h-3.5 w-3.5" />}
          rotulo={ehAdmin ? "Saldo da conta" : "Meu saldo"}
          valor={saldoAtual === null ? "—" : num(saldoAtual)}
        />
        <Metrica
          icone={<Download className="h-3.5 w-3.5" />}
          rotulo="Créditos consumidos"
          valor={num(resumo.totalCreditos)}
          detalhe="Extrações concluídas"
        />
        <Metrica
          icone={<Clock className="h-3.5 w-3.5" />}
          rotulo="Em aberto"
          valor={num(resumo.creditosEmAberto)}
          detalhe="Reservados, ainda processando"
        />
        <Metrica
          icone={<Users className="h-3.5 w-3.5" />}
          rotulo="Extrações"
          valor={num(resumo.totalExtracoes)}
          detalhe={`${num(resumo.totalLeads)} leads no total`}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-3 border-b border-white/10 p-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar no histórico</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={
                ehAdmin
                  ? "Buscar por pesquisa, CNAE, região ou usuário..."
                  : "Buscar por pesquisa, CNAE ou região..."
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/10"
            />
          </label>

          {ehAdmin && (
            <select
              value={usuarioFiltro}
              onChange={(e) => setUsuarioFiltro(e.target.value)}
              aria-label="Filtrar por usuário"
              className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-emerald-400/40 focus:outline-none"
            >
              <option value="todos">Todos os usuários</option>
              {usuarios.map(([id, rotulo]) => (
                <option key={id} value={id}>
                  {rotulo}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            aria-label="Filtrar por status"
            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-emerald-400/40 focus:outline-none"
          >
            <option value="todos">Todos os status</option>
            <option value="completed">Concluídas</option>
            <option value="processing">Em aberto</option>
            <option value="failed">Falhas</option>
          </select>

          <button
            type="button"
            onClick={exportarCsv}
            disabled={filtradas.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5 text-sm">
          <p className="text-slate-400">
            {num(filtradas.length)}{" "}
            {filtradas.length === 1 ? "extração" : "extrações"}
            {filtradas.length !== linhas.length && ` de ${num(linhas.length)}`}
          </p>
          <p className="text-slate-400">
            <span className="font-semibold tabular-nums text-white">
              {num(creditosFiltrados)}
            </span>{" "}
            créditos no filtro
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {[
                  "Data",
                  ...(ehAdmin ? ["Usuário"] : []),
                  "Pesquisa",
                  "Leads",
                  "Créditos",
                  "Status",
                ].map((c) => (
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
              {daPagina.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-white/5 align-top last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                    {dataHora(l.createdAt)}
                  </td>

                  {ehAdmin && (
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{l.usuarioNome}</p>
                      <p className="text-xs text-slate-500">{l.usuarioEmail}</p>
                    </td>
                  )}

                  <td className="px-4 py-3">
                    <Link
                      href={`/pesquisas/${l.pesquisaId}`}
                      className="text-sm font-medium text-slate-200 transition hover:text-emerald-300"
                    >
                      {l.pesquisaNome}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {formatarCnae(l.cnae)} · {l.regiao}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className="font-semibold tabular-nums text-white">
                      {num(l.leadsEntregues)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {" "}
                      de {num(l.leadsRequested)}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`font-semibold tabular-nums ${
                        l.creditsCharged > 0 ? "text-emerald-300" : "text-slate-600"
                      }`}
                    >
                      {l.creditsCharged > 0 ? `-${num(l.creditsCharged)}` : "0"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <Selo status={l.status} />
                  </td>
                </tr>
              ))}

              {daPagina.length === 0 && (
                <tr>
                  <td
                    colSpan={ehAdmin ? 6 : 5}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    {linhas.length === 0
                      ? "Nenhuma extração ainda — o consumo aparece aqui."
                      : "Nenhuma extração para esses filtros."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtradas.length > porPagina && (
          <Paginacao
            pagina={pagina}
            totalPaginas={totalPaginas}
            totalItens={filtradas.length}
            porPagina={porPagina}
            onMudar={setPagina}
            className="border-t border-white/10"
          />
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Créditos de extrações que falharam são devolvidos ao saldo, por isso
        aparecem como zero. As em aberto seguem reservadas até o resultado chegar.
      </p>
    </main>
  );
}
