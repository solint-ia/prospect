import type { LeadItem } from "./alievi";

/** Um telefone do lead, já desserializado. */
export interface Telefone {
  ddd: string;
  telefone: string;
  numero_formatado: string;
  classificacao: string;
  whatsapp: boolean;
}

/** Um e-mail do lead, já desserializado. */
export interface Email {
  endereco: string;
  usuario?: string;
  dominio?: string;
  score?: string;
  status?: string;
  pessoal?: boolean;
  prioridade?: number;
}

/**
 * Os itens de phones/email chegam como string JSON (às vezes já como objeto).
 * Um item malformado é descartado em vez de derrubar a extração inteira.
 */
function desserializar<T>(valores: unknown[] | undefined): T[] {
  return (valores ?? [])
    .map((item) => {
      if (item && typeof item === "object") return item as T;
      if (typeof item !== "string") return null;
      try {
        return JSON.parse(item) as T;
      } catch {
        return null;
      }
    })
    .filter((v): v is T => v !== null);
}

export function lerTelefones(valores: unknown): Telefone[] {
  return desserializar<Partial<Telefone>>(
    Array.isArray(valores) ? valores : []
  )
    .filter((p) => p.numero_formatado || p.telefone)
    .map((p) => ({
      ddd: String(p.ddd ?? ""),
      telefone: String(p.telefone ?? ""),
      numero_formatado: String(p.numero_formatado ?? p.telefone ?? ""),
      classificacao: String(p.classificacao ?? ""),
      whatsapp: p.whatsapp === true,
    }));
}

export function lerEmails(valores: unknown): Email[] {
  return desserializar<Partial<Email>>(Array.isArray(valores) ? valores : [])
    .filter((e) => e.endereco)
    .map((e) => ({
      endereco: String(e.endereco),
      usuario: e.usuario ? String(e.usuario) : undefined,
      dominio: e.dominio ? String(e.dominio) : undefined,
      score: e.score ? String(e.score) : undefined,
      status: e.status ? String(e.status) : undefined,
      pessoal: e.pessoal === true,
      prioridade: typeof e.prioridade === "number" ? e.prioridade : undefined,
    }));
}

export interface LeadNormalizado {
  nome: string;
  cpf: string | null;
  nomeEmpresa: string;
  nomeFantasia: string;
  cnpj: string;
  telefones: string;
  emails: string;
  endereco: string;
  nomeCidade: string | null;
  telefoneEmpresa: string | null;
  status: string | null;
  valid: boolean;
  phonesJson: Telefone[];
  emailsJson: Email[];
}

/** Achata o lead do serviço de dados no formato da tabela Lead do banco. */
export function normalizarLead(l: LeadItem): LeadNormalizado {
  const phones = lerTelefones(l.phones);
  const emails = lerEmails(l.email);

  return {
    nome: l.nome || "",
    cpf: l.cpf || null,
    nomeEmpresa: l.nome_empresa || "",
    nomeFantasia: l.nome_fantasia || "",
    cnpj: l.cnpj_empresa || "",
    // Derivados dos estruturados: servem à tabela e ao CSV simples.
    telefones: phones.map((p) => p.numero_formatado).join(" | "),
    emails: emails.map((e) => e.endereco).join(" | "),
    endereco: l.endereco_empresa || "",
    nomeCidade: l.nome_cidade || null,
    telefoneEmpresa: l.telefone_empresa || null,
    status: l.status || null,
    valid: l.valid === true,
    phonesJson: phones,
    emailsJson: emails,
  };
}
