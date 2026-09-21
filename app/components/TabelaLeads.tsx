"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Mail, Phone, Search, Table2 } from "lucide-react";
import {
  emailsDo,
  exportarCSV,
  formatarCnpj,
  telefonesDo,
  type FormatoCsv,
  type LeadExportavel,
} from "@/lib/csv";
import { BadgeWhatsApp } from "./IconeWhatsApp";
import ModalDetalheLead from "./ModalDetalheLead";
import ModalFormatoExportacao from "./ModalFormatoExportacao";
import Paginacao from "./Paginacao";
import { num } from "./ui";

export type LeadLinha = LeadExportavel;

const COLUNAS = [
  "Sócio / Contato",
  "Empresa",
  "CNPJ",
  "Telefones (WhatsApp)",
  "E-mails",
  "Endereço",
];

/** Mostra os primeiros itens e resume o resto, para a linha não crescer demais. */
function Resumo({
  itens,
  icone,
  limite = 2,
  render,
}: {
  itens: unknown[];
  icone: React.ReactNode;
  limite?: number;
  render: (item: never, i: number) => React.ReactNode;
}) {
  if (itens.length === 0) return <span className="text-slate-600">—</span>;

  return (
    <div className="flex flex-col gap-1">
      {itens.slice(0, limite).map((item, i) => (
        <span key={i} className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="shrink-0 text-slate-600">{icone}</span>
          {render(item as never, i)}
        </span>
      ))}
      {itens.length > limite && (
        <span className="text-[11px] text-slate-500">
          +{itens.length - limite} {itens.length - limite === 1 ? "outro" : "outros"}
        </span>
      )}
    </div>
  );
}

/**
 * Na tabela só entram os números com WhatsApp — são os acionáveis.
 * Os demais ficam na ficha do lead, que abre ao clicar na linha.
 */
const LIMITE_TELEFONES = 3;

function TelefonesWhatsApp({ lead }: { lead: LeadLinha }) {
  const todos = telefonesDo(lead);
  const comWhats = todos.filter((t) => t.whatsapp);
  const semWhats = todos.length - comWhats.length;

  const restante = (n: number, rotulo: string) => (
    <span className="text-[11px] text-slate-500">
      +{n} {rotulo}
    </span>
  );

  if (todos.length === 0) return <span className="text-slate-600">—</span>;

  if (comWhats.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-slate-600">Nenhum com WhatsApp</span>
        {semWhats > 0 &&
          restante(semWhats, semWhats === 1 ? "número na ficha" : "números na ficha")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {comWhats.slice(0, LIMITE_TELEFONES).map((p, i) => (
        <span key={i} className="flex items-center gap-1.5 whitespace-nowrap">
          <Phone className="h-3 w-3 shrink-0 text-slate-600" />
          {p.numero_formatado}
          <BadgeWhatsApp compacto />
          {p.classificacao && (
            <span className="rounded bg-slate-800 px-1 text-[10px] font-bold text-amber-300">
              {p.classificacao}
            </span>
          )}
        </span>
      ))}
      {comWhats.length > LIMITE_TELEFONES &&
        restante(comWhats.length - LIMITE_TELEFONES, "com WhatsApp")}
      {semWhats > 0 &&
        restante(semWhats, semWhats === 1 ? "sem WhatsApp" : "sem WhatsApp")}
    </div>
  );
}

export default function TabelaLeads({
  leads,
  nomeArquivo,
}: {
  leads: LeadLinha[];
  nomeArquivo: string;
}) {
  const [modalFormato, setModalFormato] = useState(false);
  const [leadAberto, setLeadAberto] = useState<LeadLinha | null>(null);
  const [busca, setBusca] = useState("");
  const [campoBusca, setCampoBusca] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);

  const leadsFiltrados = useMemo(() => {
    const termo = busca
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    if (!termo) return leads;

    return leads.filter((lead) => {
      const campos: Record<string, string> = {
        contato: [lead.nome, lead.cpf].filter(Boolean).join(" "),
        empresa: [lead.nomeEmpresa, lead.nomeFantasia].filter(Boolean).join(" "),
        cnpj: [lead.cnpj, formatarCnpj(lead.cnpj)].filter(Boolean).join(" "),
        telefone: telefonesDo(lead)
          .map((telefone) => `${telefone.telefone} ${telefone.numero_formatado}`)
          .join(" "),
        email: emailsDo(lead)
          .map((email) => email.endereco)
          .join(" "),
        endereco: [lead.endereco, lead.nomeCidade].filter(Boolean).join(" "),
      };
      const valores = campoBusca === "todos" ? Object.values(campos) : [campos[campoBusca]];

      return valores.some((valor) =>
        (valor ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(termo)
      );
    });
  }, [busca, campoBusca, leads]);

  const totalPaginas = Math.max(1, Math.ceil(leadsFiltrados.length / porPagina));
  const leadsDaPagina = leadsFiltrados.slice(
    (pagina - 1) * porPagina,
    pagina * porPagina
  );

  useEffect(() => setPagina(1), [busca, campoBusca, porPagina]);

  useEffect(() => {
    setPagina((atual) => Math.min(atual, totalPaginas));
  }, [totalPaginas]);

  function baixar(formato: FormatoCsv) {
    exportarCSV(leadsFiltrados, formato, nomeArquivo);
    setModalFormato(false);
  }

  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-500">
        Esta extração não retornou nenhum lead.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-slate-950/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <Table2 className="h-4 w-4 text-emerald-400" />
            {busca && leadsFiltrados.length !== leads.length
              ? `${num(leadsFiltrados.length)} de ${num(leads.length)}`
              : num(leads.length)}{" "}
            {leads.length === 1 ? "lead" : "leads"}
            <span className="hidden text-xs font-normal text-slate-500 sm:inline">
              · clique numa linha para ver a ficha completa
            </span>
          </p>
          <button
            type="button"
            onClick={() => setModalFormato(true)}
            className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/20"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-white/10 p-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Busca rápida nos leads</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Busca rápida nos leads..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/10"
            />
          </label>

          <select
            value={campoBusca}
            onChange={(evento) => setCampoBusca(evento.target.value)}
            aria-label="Campo da busca de leads"
            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-emerald-400/40 focus:outline-none"
          >
            <option value="todos">Todos os campos</option>
            <option value="contato">Sócio / contato</option>
            <option value="empresa">Empresa</option>
            <option value="cnpj">CNPJ</option>
            <option value="telefone">Telefone</option>
            <option value="email">E-mail</option>
            <option value="endereco">Endereço</option>
          </select>

          <label className="flex items-center gap-2 text-xs text-slate-500">
            Exibir
            <select
              value={porPagina}
              onChange={(evento) => setPorPagina(Number(evento.target.value))}
              className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-sm text-slate-300 focus:border-emerald-400/40 focus:outline-none"
            >
              {[10, 25, 50, 100].map((quantidade) => (
                <option key={quantidade} value={quantidade}>
                  {quantidade}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {COLUNAS.map((c) => (
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
              {leadsDaPagina.map((l) => {
                const emails = emailsDo(l);

                return (
                  <tr
                    key={l.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => setLeadAberto(l)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setLeadAberto(l);
                      }
                    }}
                    className="cursor-pointer border-b border-white/5 align-top transition last:border-0 hover:bg-white/[0.04] focus:bg-white/[0.06] focus:outline-none"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {l.nome || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <p>{l.nomeEmpresa || <span className="text-slate-600">—</span>}</p>
                      {l.nomeFantasia && l.nomeFantasia !== l.nomeEmpresa && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {l.nomeFantasia}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">
                      {formatarCnpj(l.cnpj) || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <TelefonesWhatsApp lead={l} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <Resumo
                        itens={emails}
                        icone={<Mail className="h-3 w-3" />}
                        render={(e: (typeof emails)[number]) => e.endereco}
                      />
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs leading-snug text-slate-400">
                      {l.endereco || <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                );
              })}
              {leadsDaPagina.length === 0 && (
                <tr>
                  <td colSpan={COLUNAS.length} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nenhum lead corresponde à busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Paginacao
          pagina={pagina}
          totalPaginas={totalPaginas}
          totalItens={leadsFiltrados.length}
          porPagina={porPagina}
          onMudar={setPagina}
        />
      </div>

      {modalFormato && (
        <ModalFormatoExportacao
          total={leadsFiltrados.length}
          onFechar={() => setModalFormato(false)}
          onConfirmar={baixar}
        />
      )}

      {leadAberto && (
        <ModalDetalheLead lead={leadAberto} onFechar={() => setLeadAberto(null)} />
      )}
    </>
  );
}
