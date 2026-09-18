import { lerEmails, lerTelefones, type Email, type Telefone } from "./leads";

export type FormatoCsv = "agrupado" | "linhas";

/** O que a tabela e o modal recebem: o Lead do banco, com os JSON já tipados. */
export interface LeadExportavel {
  id: string;
  nome: string | null;
  cpf: string | null;
  nomeEmpresa: string | null;
  nomeFantasia: string | null;
  cnpj: string | null;
  telefones: string | null;
  emails: string | null;
  endereco: string | null;
  nomeCidade: string | null;
  telefoneEmpresa: string | null;
  status: string | null;
  valid: boolean;
  phonesJson: unknown;
  emailsJson: unknown;
  createdAt?: string;
}

/**
 * Excel pt-BR abre CSV com `;`; com `,` ele joga a linha toda numa célula.
 * Troque aqui se precisar do padrão internacional.
 */
const SEPARADOR = ";";

const COLUNAS_AGRUPADO = [
  "Empresa",
  "CNPJ",
  "Endereço da Empresa",
  "Telefone da Empresa",
  "Nome do Sócio",
  "CPF do Sócio",
  "Telefones do Sócio",
  "Emails do Sócio",
  "Status",
];

const COLUNAS_LINHAS = [
  "Empresa",
  "CNPJ",
  "Endereço da Empresa",
  "Telefone da Empresa",
  "Nome do Sócio",
  "CPF do Sócio",
  "Telefone do Sócio",
  "Classificação",
  "WhatsApp",
  "Emails do Sócio",
  "Status",
  "Válido",
];

/** Aspas duplicadas e campo entre aspas: o padrão RFC 4180. */
function celula(valor: string | null | undefined): string {
  return `"${(valor ?? "").replace(/"/g, '""')}"`;
}

const simNao = (v: boolean) => (v ? "Sim" : "Não");

/** A API devolve "entrada"; a planilha mostra "Entrada". */
function capitalizar(texto: string | null): string {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

export function formatarCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return "";
  const d = cnpj.replace(/\D/g, "");
  return d.length === 14
    ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
    : cnpj;
}

export function formatarCpf(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const d = cpf.replace(/\D/g, "");
  return d.length === 11
    ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
    : cpf;
}

/** Telefones de um lead, preferindo o estruturado e caindo no achatado. */
export function telefonesDo(lead: LeadExportavel): Telefone[] {
  const estruturados = lerTelefones(lead.phonesJson);
  if (estruturados.length > 0) return estruturados;

  // Leads gravados antes do schema estruturado só têm a string achatada.
  return (lead.telefones ?? "")
    .split("|")
    .map((n) => n.trim())
    .filter(Boolean)
    .map((numero) => ({
      ddd: "",
      telefone: numero.replace(/\D/g, ""),
      numero_formatado: numero,
      classificacao: "",
      whatsapp: false,
    }));
}

export function emailsDo(lead: LeadExportavel): Email[] {
  const estruturados = lerEmails(lead.emailsJson);
  if (estruturados.length > 0) return estruturados;

  return (lead.emails ?? "")
    .split("|")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((endereco) => ({ endereco }));
}

/** `(79) 99908-0693 [A0][WhatsApp]; (79) 3631-1588 [D2]` */
function celulaTelefonesAgrupados(telefones: Telefone[]): string {
  return telefones
    .map((p) => {
      const classe = p.classificacao ? `[${p.classificacao}]` : "";
      const wa = p.whatsapp ? "[WhatsApp]" : "";
      // Espaço só quando há marcador, para não deixar "(79) 3631-1588 " sobrando.
      return [p.numero_formatado, classe + wa].filter(Boolean).join(" ");
    })
    .join("; ");
}

/** Uma linha por sócio; todos os telefones numa célula só. */
function linhasAgrupado(leads: LeadExportavel[]): string[][] {
  return leads.map((l) => [
    l.nomeEmpresa ?? "",
    formatarCnpj(l.cnpj),
    l.endereco ?? "",
    l.telefoneEmpresa ?? "",
    l.nome ?? "",
    formatarCpf(l.cpf),
    celulaTelefonesAgrupados(telefonesDo(l)),
    emailsDo(l).map((e) => e.endereco).join("; "),
    capitalizar(l.status),
  ]);
}

/**
 * Uma linha por telefone: a empresa e o sócio se repetem.
 * Um sócio sem telefone ainda rende uma linha, com as colunas de número vazias,
 * para não sumir da planilha.
 */
function linhasPorTelefone(leads: LeadExportavel[]): string[][] {
  const linhas: string[][] = [];

  for (const l of leads) {
    const base = [
      l.nomeEmpresa ?? "",
      formatarCnpj(l.cnpj),
      l.endereco ?? "",
      l.telefoneEmpresa ?? "",
      l.nome ?? "",
      formatarCpf(l.cpf),
    ];
    const cauda = [
      emailsDo(l).map((e) => e.endereco).join("; "),
      capitalizar(l.status),
      simNao(l.valid),
    ];

    const telefones = telefonesDo(l);

    if (telefones.length === 0) {
      linhas.push([...base, "", "", "", ...cauda]);
      continue;
    }

    for (const p of telefones) {
      linhas.push([
        ...base,
        p.numero_formatado,
        p.classificacao,
        simNao(p.whatsapp),
        ...cauda,
      ]);
    }
  }

  return linhas;
}

export function gerarCsv(leads: LeadExportavel[], formato: FormatoCsv): string {
  const colunas = formato === "agrupado" ? COLUNAS_AGRUPADO : COLUNAS_LINHAS;
  const linhas =
    formato === "agrupado" ? linhasAgrupado(leads) : linhasPorTelefone(leads);

  const corpo = [colunas, ...linhas]
    .map((linha) => linha.map(celula).join(SEPARADOR))
    .join("\r\n");

  // BOM para o Excel reconhecer o UTF-8 e não quebrar os acentos.
  return "﻿" + corpo;
}

/** Gera o CSV no formato escolhido e dispara o download no navegador. */
export function exportarCSV(
  leads: LeadExportavel[],
  formato: FormatoCsv,
  nomeArquivo = "leads"
): void {
  const blob = new Blob([gerarCsv(leads, formato)], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nomeArquivo}_${formato}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
