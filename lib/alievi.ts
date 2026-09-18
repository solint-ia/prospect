import axios, { AxiosInstance } from "axios";

export interface LeadItem {
  id: string;
  nome: string;
  cpf: string | null;
  nome_empresa: string;
  nome_fantasia: string;
  cnpj_empresa: string;
  /** Itens vêm como string JSON: use lerTelefones()/lerEmails() de lib/leads. */
  phones: unknown[];
  email: unknown[];
  endereco_empresa: string;
  nome_cidade: string | null;
  telefone_empresa: string | null;
  status: string | null;
  valid: boolean;
}

export interface CnaeItem {
  cod: string;
  descricao: string;
}

/** Filtros da etapa 1: definem o universo de empresas, sem quantidade ainda. */
export interface FiltroParams {
  nome: string;
  cnae: string;
  estado: string;
  capitalMin: number;
  capitalMax: number;
}

export interface Estimativa {
  totalEmpresas: number;
  totalLeads: number;
}

const BASE_URL = "https://app.alieviprospect.com/api";
const ESTIMATIVA_URL = "https://backsec.alievichat.com/webhook/estimativa";
const POLL_INTERVAL_MS = 2500;
const POLL_MAX_TENTATIVAS = 60;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

export class AlieviService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 60000,
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
      },
    });
  }

  async login(): Promise<{ token: string; credits: number }> {
    const username = process.env.ALIEVI_USERNAME;
    const password = process.env.ALIEVI_PASSWORD;

    if (!username || !password) {
      throw new Error(
        "Credenciais do serviço de dados ausentes no .env do servidor."
      );
    }

    const { data } = await this.client.post("/login", { username, password });

    if (!data?.token) {
      throw new Error("A autenticação no serviço de dados não retornou token.");
    }

    this.token = data.token;
    this.client.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;

    return { token: data.token, credits: Number(data.credits ?? 0) };
  }

  /** Garante um token válido antes de qualquer chamada autenticada. */
  private async ensureAuth(): Promise<void> {
    if (!this.token) await this.login();
  }

  /** Consulta apenas o saldo de créditos da conta. */
  async saldo(): Promise<number> {
    const { credits } = await this.login();
    return credits;
  }

  /**
   * Lista completa de CNAEs da plataforma (~1.3k itens). O endpoint ignora
   * parâmetros de busca, então a filtragem acontece no cliente.
   */
  async listarCnaes(): Promise<CnaeItem[]> {
    await this.ensureAuth();

    const { data } = await this.client.get("/cnaes");
    if (!Array.isArray(data)) throw new Error("Não foi possível carregar a lista de CNAEs.");

    return data
      .filter((c) => c?.cod && c?.descricao)
      .map((c) => ({ cod: String(c.cod), descricao: String(c.descricao) }));
  }

  /**
   * Quantas empresas e sócios existem para os filtros, antes de gastar crédito.
   * Vive em outro host (webhook n8n) e não usa o token da plataforma.
   */
  async estimar(params: FiltroParams): Promise<Estimativa> {
    const { data } = await axios.post(
      ESTIMATIVA_URL,
      {
        user: 1,
        cnae_primario: [params.cnae],
        cnae_secundario: [],
        capitalsocial: {
          inicial: params.capitalMin,
          final: params.capitalMax,
        },
        codmunicio: null,
        coduf: params.estado,
      },
      {
        timeout: 60000,
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/json" },
      }
    );

    // O webhook devolve os totais como string ("1433") e escreve "totaleads".
    return {
      totalEmpresas: Number(data?.totalempresas ?? 0),
      totalLeads: Number(data?.totaleads ?? 0),
    };
  }

  /** Cria a pesquisa e devolve o researchId, que a etapa 2 reutiliza. */
  async criarPesquisa(
    params: FiltroParams,
    estimatedLeads: number
  ): Promise<string> {
    await this.ensureAuth();

    const { data } = await this.client.post("/researches", {
      name: params.nome,
      cnaes: [params.cnae],
      cnaePrimario: params.cnae,
      state: params.estado,
      capitalRange: `${params.capitalMin}-${params.capitalMax}`,
      estimatedLeads,
    });

    if (!data?.id) throw new Error("O serviço de dados não retornou o ID da pesquisa.");
    return data.id as string;
  }

  /**
   * Etapa 2: dispara a extração numa pesquisa já criada, aguarda o
   * processamento e devolve os leads.
   */
  async extrairDaPesquisa(
    researchId: string,
    leadsCount: number
  ): Promise<{ extractionId: string; leads: LeadItem[] }> {
    await this.ensureAuth();

    const { data: extracao } = await this.client.post(
      `/researches/${researchId}/extractions`,
      { leadsCount: Number(leadsCount) }
    );
    const extractionId = extracao?.id;
    if (!extractionId) throw new Error("O serviço de dados não retornou o ID da extração.");

    let concluido = false;
    let tentativas = 0;

    while (!concluido && tentativas < POLL_MAX_TENTATIVAS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const { data: statusResp } = await this.client.get(
        `/extractions/${extractionId}`
      );
      const status = String(statusResp?.status ?? "").toLowerCase();

      if (status === "completed") {
        concluido = true;
      } else if (status === "failed" || status === "error") {
        throw new Error("A extração falhou no serviço de dados.");
      }

      tentativas++;
    }

    if (!concluido) throw new Error("A extração demorou muito para responder.");

    const { data: leads } = await this.client.get(
      `/extractions/${extractionId}/leads`
    );

    return {
      extractionId,
      leads: Array.isArray(leads) ? leads : (leads?.leads ?? []),
    };
  }
}

/**
 * Cada request cria a sua própria instância: a aplicação é stateless e
 * assim evitamos reaproveitar um token já expirado entre requisições.
 */
export function criarAlieviService(): AlieviService {
  return new AlieviService();
}
