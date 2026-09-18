import type { FiltroParams } from "./alievi";

/** Os campos chegam como string do formulário; aqui viram objeto validado. */
export function lerFiltros(body: Record<string, unknown>): FiltroParams {
  const nome = String(body.nome ?? "").trim();
  const cnae = String(body.cnae ?? "").replace(/\D/g, "");
  const estado = String(body.estado ?? "").trim().toUpperCase();
  const capitalMin = Number(body.capitalMin ?? 0);
  const capitalMax = Number(body.capitalMax ?? 0);

  if (!nome) throw new Error("Informe o nome da pesquisa.");
  if (!cnae) throw new Error("Selecione um CNAE primário válido.");
  if (estado.length !== 2) throw new Error("Selecione um estado (UF) válido.");
  if (!Number.isFinite(capitalMin) || capitalMin < 0)
    throw new Error("Capital social mínimo inválido.");
  if (!Number.isFinite(capitalMax) || capitalMax < capitalMin)
    throw new Error("Capital social máximo deve ser maior ou igual ao mínimo.");

  return { nome, cnae, estado, capitalMin, capitalMax };
}
