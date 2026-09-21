"use client";

import { useEffect } from "react";
import {
  Building2,
  Calendar,
  Mail,
  MapPin,
  Phone,
  User,
  X,
} from "lucide-react";
import {
  emailsDo,
  formatarCnpj,
  formatarCpf,
  telefonesDo,
  type LeadExportavel,
} from "@/lib/csv";
import { BadgeWhatsApp } from "./IconeWhatsApp";
import { dataHora } from "./ui";

function Dado({
  rotulo,
  valor,
  className = "",
  mono = false,
}: {
  rotulo: string;
  valor: string | null | undefined;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {rotulo}
      </p>
      <p
        className={`mt-0.5 break-words text-sm text-white ${mono ? "font-mono" : ""}`}
      >
        {valor || <span className="text-slate-600">—</span>}
      </p>
    </div>
  );
}

function Bloco({
  icone,
  titulo,
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3.5 flex items-center gap-2 text-sm font-semibold text-white">
        <span className="text-emerald-400">{icone}</span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export default function ModalDetalheLead({
  lead,
  onFechar,
}: {
  lead: LeadExportavel;
  onFechar: () => void;
}) {
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const telefones = telefonesDo(lead);
  const emails = emailsDo(lead);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-lead"
        className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-slate-950 shadow-2xl shadow-black/60"
      >
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur">
          <span className="mt-0.5 shrink-0 rounded-lg bg-emerald-400/10 p-2 text-emerald-400">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="titulo-lead" className="truncate font-semibold text-white">
              {lead.nomeFantasia || lead.nomeEmpresa || "Empresa sem nome"}
            </h2>
            {lead.nomeEmpresa && lead.nomeEmpresa !== lead.nomeFantasia && (
              <p className="truncate text-sm text-slate-400">{lead.nomeEmpresa}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            title="Fechar"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <Bloco icone={<Building2 className="h-4 w-4" />} titulo="Empresa">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <Dado
                rotulo="Nome fantasia"
                valor={lead.nomeFantasia}
                className="col-span-2"
              />
              <Dado
                rotulo="Razão social"
                valor={lead.nomeEmpresa}
                className="col-span-2"
              />
              <Dado rotulo="CNPJ" valor={formatarCnpj(lead.cnpj)} mono />
              <Dado rotulo="Cidade" valor={lead.nomeCidade} />
              <Dado
                rotulo="Telefone da empresa"
                valor={lead.telefoneEmpresa}
                className="col-span-2"
              />
              <Dado
                rotulo="Endereço"
                valor={lead.endereco}
                className="col-span-2"
              />
            </div>
          </Bloco>

          <Bloco icone={<User className="h-4 w-4" />} titulo="Contato">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <Dado
                  rotulo="Nome da pessoa"
                  valor={lead.nome}
                  className={lead.cpf ? "" : "col-span-2"}
                />
                {lead.cpf && <Dado rotulo="CPF" valor={formatarCpf(lead.cpf)} mono />}
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  E-mails
                </p>
                {emails.length === 0 ? (
                  <p className="text-sm text-slate-600">Nenhum e-mail.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {emails.map((e, i) => (
                      <li
                        key={`${e.endereco}-${i}`}
                        className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-slate-900/60 px-3 py-2.5"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 shrink-0 text-slate-600" />
                            <span className="truncate text-sm font-medium text-sky-300">
                              {e.endereco}
                            </span>
                          </span>
                          {e.score && (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              Score: {e.score}
                            </span>
                          )}
                        </span>
                        {e.dominio && (
                          <span className="shrink-0 rounded-md bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                            {e.dominio}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Telefones
                </p>
                {telefones.length === 0 ? (
                  <p className="text-sm text-slate-600">Nenhum telefone.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {telefones.map((p, i) => (
                      <li
                        key={`${p.numero_formatado}-${i}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-900/60 px-3 py-2.5"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0 text-slate-600" />
                            <span className="truncate text-sm font-semibold text-emerald-400">
                              {p.numero_formatado}
                            </span>
                            {p.whatsapp && <BadgeWhatsApp />}
                          </span>
                          {(p.ddd || p.telefone) && (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {p.ddd && `DDD: ${p.ddd} · `}
                              {p.telefone}
                            </span>
                          )}
                        </span>
                        {p.classificacao && (
                          <span className="shrink-0 rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-[11px] font-bold text-amber-300">
                            {p.classificacao}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Bloco>

          <footer className="flex flex-wrap items-center gap-2 px-1 text-xs text-slate-500">
            {lead.createdAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Criado em {dataHora(lead.createdAt)}
              </span>
            )}
            {lead.status && (
              <>
                <span aria-hidden>·</span>
                <span className="rounded-md bg-sky-500/15 px-2 py-0.5 font-medium capitalize text-sky-300">
                  {lead.status}
                </span>
              </>
            )}
            {lead.nomeCidade && (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {lead.nomeCidade}
                </span>
              </>
            )}
          </footer>
        </div>
      </aside>
    </div>
  );
}
