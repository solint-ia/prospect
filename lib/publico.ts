import type { Extraction, Research } from "@prisma/client";

/**
 * O que sai para o navegador. Os IDs do fornecedor de dados ficam só no
 * servidor; o cliente recebe apenas se a pesquisa está apta a extrair.
 */
export function pesquisaPublica<T extends Research>(r: T) {
  const { alieviResearchId, ...resto } = r;
  return { ...resto, podeExtrair: Boolean(alieviResearchId) };
}

export function extracaoPublica<T extends Extraction>(e: T) {
  const { alieviExtractionId, ...resto } = e;
  void alieviExtractionId;
  return resto;
}

/** Rótulo da região de uma pesquisa: município quando houver, senão a UF. */
export function regiaoDeFiltro(p: {
  state: string | null;
  municipioNome: string | null;
}): string {
  return p.municipioNome ?? p.state ?? "—";
}
