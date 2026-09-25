"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

export interface CnaeItem {
  cod: string;
  descricao: string;
}

/** "Farmacêuticos" e "farmaceuticos" precisam casar com a mesma busca. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Exibe 4771-7/01 em vez de 4771701, no formato oficial do IBGE. */
export function formatarCnae(cod: string): string {
  return cod.length === 7
    ? `${cod.slice(0, 4)}-${cod.slice(4, 5)}/${cod.slice(5)}`
    : cod;
}

const MAX_RESULTADOS = 50;
const MIN_PREFIXO = 4;
const RAZAO_PREFIXO = 0.6;

function prefixoComum(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Quem procura "farmacia" espera achar "produtos farmacêuticos": mesmo radical,
 * sufixo diferente. Exigimos um prefixo comum longo para não virar ruído.
 */
function casaRadical(descricao: string, termo: string): boolean {
  if (termo.length < MIN_PREFIXO) return false;
  const minimo = Math.max(MIN_PREFIXO, Math.ceil(termo.length * RAZAO_PREFIXO));
  return descricao
    .split(/[^a-z0-9]+/)
    .some((palavra) => prefixoComum(palavra, termo) >= minimo);
}

/**
 * Ordena por relevância: código primeiro (quem digita número quer o código),
 * depois descrições que começam com o termo, as que o contêm e, por fim, as
 * que compartilham o radical.
 */
function buscar(cnaes: CnaeItem[], termo: string): CnaeItem[] {
  const t = normalizar(termo.trim());
  if (!t) return cnaes.slice(0, MAX_RESULTADOS);

  const soDigitos = t.replace(/\D/g, "");
  const pontuados: { item: CnaeItem; peso: number }[] = [];

  for (const item of cnaes) {
    const desc = normalizar(item.descricao);
    let peso = -1;

    if (soDigitos && item.cod.startsWith(soDigitos)) peso = 0;
    else if (soDigitos && item.cod.includes(soDigitos)) peso = 1;
    else if (desc.startsWith(t)) peso = 2;
    else if (desc.includes(t)) peso = 3;
    else if (!soDigitos && casaRadical(desc, t)) peso = 4;

    if (peso >= 0) pontuados.push({ item, peso });
  }

  return pontuados
    .sort((a, b) => a.peso - b.peso || a.item.cod.localeCompare(b.item.cod))
    .slice(0, MAX_RESULTADOS)
    .map((p) => p.item);
}

/** Destaca o trecho que casou com a busca, ignorando acentos. */
function Realce({ texto, termo }: { texto: string; termo: string }) {
  const t = normalizar(termo.trim());
  if (!t) return <>{texto}</>;

  const inicio = normalizar(texto).indexOf(t);
  if (inicio < 0) return <>{texto}</>;

  return (
    <>
      {texto.slice(0, inicio)}
      <mark className="bg-emerald-400/25 text-emerald-200">
        {texto.slice(inicio, inicio + t.length)}
      </mark>
      {texto.slice(inicio + t.length)}
    </>
  );
}

export default function CnaeCombobox({
  value,
  onChange,
  placeholder,
  ocultar = [],
}: {
  value: string;
  onChange: (cod: string) => void;
  /** Texto do campo de busca; o padrão serve ao CNAE primário. */
  placeholder?: string;
  /** Códigos que não devem aparecer (já escolhidos em outro campo). */
  ocultar?: string[];
}) {
  const [cnaes, setCnaes] = useState<CnaeItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [destacado, setDestacado] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const res = await fetch("/api/cnaes");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falha ao carregar os CNAEs.");
        if (ativo) setCnaes(data.cnaes);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Falha ao carregar os CNAEs.");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // Fecha ao clicar fora do componente.
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const disponiveis = useMemo(
    () => (ocultar.length ? cnaes.filter((c) => !ocultar.includes(c.cod)) : cnaes),
    [cnaes, ocultar]
  );
  const resultados = useMemo(
    () => buscar(disponiveis, termo),
    [disponiveis, termo]
  );
  const selecionado = useMemo(
    () => cnaes.find((c) => c.cod === value) ?? null,
    [cnaes, value]
  );

  useEffect(() => setDestacado(0), [termo]);

  // Mantém o item destacado visível durante a navegação por teclado.
  useEffect(() => {
    if (!aberto) return;
    listaRef.current
      ?.querySelector(`[data-indice="${destacado}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [destacado, aberto]);

  function selecionar(item: CnaeItem) {
    onChange(item.cod);
    setTermo("");
    setAberto(false);
    inputRef.current?.blur();
  }

  function limpar() {
    onChange("");
    setTermo("");
    setAberto(true);
    inputRef.current?.focus();
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!aberto) {
        setAberto(true);
        return;
      }
      const passo = e.key === "ArrowDown" ? 1 : -1;
      setDestacado((i) => {
        const proximo = i + passo;
        if (proximo < 0) return resultados.length - 1;
        if (proximo >= resultados.length) return 0;
        return proximo;
      });
    } else if (e.key === "Enter") {
      // Sem preventDefault o Enter submeteria o formulário inteiro.
      if (aberto && resultados[destacado]) {
        e.preventDefault();
        selecionar(resultados[destacado]);
      }
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  // Código digitado que não existe na tabela: ainda assim deixamos usar.
  const digitosSoltos = termo.replace(/\D/g, "");
  const codigoAvulso =
    digitosSoltos.length === 7 && resultados.length === 0 ? digitosSoltos : null;

  return (
    <div ref={containerRef} className="relative">
      {selecionado || value ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2.5">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-semibold text-emerald-200">
              {formatarCnae(value)}
            </p>
            {selecionado && (
              <p className="mt-0.5 text-xs leading-snug text-slate-300">
                {selecionado.descricao}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={limpar}
            title="Trocar CNAE"
            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={aberto}
              aria-controls="lista-cnaes"
              aria-autocomplete="list"
              autoComplete="off"
              value={termo}
              disabled={carregando || !!erro}
              onChange={(e) => {
                setTermo(e.target.value);
                setAberto(true);
              }}
              onFocus={() => setAberto(true)}
              onKeyDown={aoTeclar}
              placeholder={
                carregando
                  ? "Carregando CNAEs..."
                  : (placeholder ?? "Digite 4771 ou farmácia...")
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-slate-500 transition focus:border-emerald-400/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-60"
            />
            {carregando ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
            ) : (
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            )}
          </div>

          {aberto && !carregando && !erro && (
            <ul
              id="lista-cnaes"
              ref={listaRef}
              role="listbox"
              className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl shadow-black/60"
            >
              {resultados.map((item, i) => (
                <li key={item.cod} data-indice={i}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === destacado}
                    onMouseEnter={() => setDestacado(i)}
                    onClick={() => selecionar(item)}
                    className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition ${
                      i === destacado ? "bg-emerald-500/15" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="mt-px shrink-0 font-mono text-xs font-semibold text-emerald-400">
                      {formatarCnae(item.cod)}
                    </span>
                    <span className="min-w-0 text-xs leading-snug text-slate-300">
                      <Realce texto={item.descricao} termo={termo} />
                    </span>
                  </button>
                </li>
              ))}

              {codigoAvulso && (
                <li>
                  <button
                    type="button"
                    onClick={() => selecionar({ cod: codigoAvulso, descricao: "" })}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/5"
                  >
                    Usar o código
                    <span className="font-mono font-semibold text-emerald-400">
                      {formatarCnae(codigoAvulso)}
                    </span>
                    mesmo assim
                  </button>
                </li>
              )}

              {resultados.length === 0 && !codigoAvulso && (
                <li className="px-3 py-3 text-xs text-slate-500">
                  Nenhum CNAE encontrado para &ldquo;{termo}&rdquo;.
                </li>
              )}

              {resultados.length === MAX_RESULTADOS && (
                <li className="border-t border-white/5 px-3 py-2 text-[11px] text-slate-500">
                  Mostrando os {MAX_RESULTADOS} primeiros — refine a busca.
                </li>
              )}
            </ul>
          )}
        </>
      )}

      {erro && <p className="mt-1.5 text-xs text-rose-400">{erro}</p>}
    </div>
  );
}
