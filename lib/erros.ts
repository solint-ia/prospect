import axios from "axios";

/**
 * Transforma erros do serviço de dados em mensagem para a UI.
 * O texto cru do fornecedor (corpo da resposta, hostname em erro de rede) nunca
 * chega à tela: vai só para o log do servidor.
 */
export function mensagemDeErro(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    console.error("[servico de dados]", status ?? error.code, error.message);

    if (status === 401 || status === 403) {
      return "Falha de autenticação no serviço de dados. Verifique as credenciais do servidor.";
    }
    if (status && status >= 500) {
      return "O serviço de dados está instável no momento. Tente novamente em instantes.";
    }
    if (status) {
      return `O serviço de dados recusou a solicitação (código ${status}).`;
    }
    // Sem resposta: timeout, DNS, conexão recusada.
    return "Não foi possível conectar ao serviço de dados. Tente novamente em instantes.";
  }

  return error instanceof Error ? error.message : "Erro desconhecido.";
}

/** Rotas autenticadas: sem sessão vira 401, sem permissão 403, saldo 402. */
export function statusDoErro(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  if (error.name === "NaoAutenticado") return 401;
  if (error.name === "SemPermissao") return 403;
  if (error.name === "SaldoInsuficiente") return 402;
  return 500;
}
