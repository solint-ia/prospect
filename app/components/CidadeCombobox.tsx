"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin, Search, X } from "lucide-react";

export interface CidadeItem {
  id: number;
  nome: string;
}

const MIN_BUSCA = 2;
const DEBOUNCE_MS = 300;

export default function CidadeCombobox({
  cidade,
  onChange,
}: {
  cidade: CidadeItem | null;
  onChange: (cidade: CidadeItem | null) => void;
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<CidadeItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [destacado, setDestacado] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A lista é grande demais para vir inteira: busca no servidor conforme digita.
  useEffect(() => {
    const busca = termo.trim();
    if (busca.length < MIN_BUSCA) {
      setResultados([]);
      setCarregando(false);
      return;
    }

    let ativo = true;
    setCarregando(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cidades?busca=${encodeURIComponent(busca)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falha ao buscar municípios.");
        if (ativo) {
          setResultados(data.cidades);
          setDestacado(0);
          setErro(null);
        }
      } catch (e) {
        if (ativo) {
          setErro(e instanceof Error ? e.message : "Falha ao buscar municípios.");
          setResultados([]);
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [termo]);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function selecionar(item: CidadeItem) {
    onChange(item);
    setTermo("");
    setResultados([]);
    setAberto(false);
    inputRef.current?.blur();
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (resultados.length === 0) return;
      const passo = e.key === "ArrowDown" ? 1 : -1;
      setDestacado((i) => (i + passo + resultados.length) % resultados.length);
    } else if (e.key === "Enter") {
      if (aberto && resultados[destacado]) {
        e.preventDefault();
        selecionar(resultados[destacado]);
      }
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  if (cidade) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2.5">
        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-emerald-200">
          {cidade.nome}
        </p>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setTermo("");
          }}
          title="Trocar município"
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={aberto}
          aria-autocomplete="list"
          autoComplete="off"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={aoTeclar}
          placeholder="Buscar município..."
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-slate-500 transition focus:border-emerald-400/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
        />
        {carregando && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
        )}
      </div>

      {aberto && termo.trim().length >= MIN_BUSCA && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl shadow-black/60"
        >
          {resultados.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === destacado}
                onMouseEnter={() => setDestacado(i)}
                onClick={() => selecionar(item)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  i === destacado ? "bg-emerald-500/15" : "hover:bg-white/5"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="min-w-0 truncate text-slate-200">{item.nome}</span>
              </button>
            </li>
          ))}

          {!carregando && resultados.length === 0 && (
            <li className="px-3 py-3 text-xs text-slate-500">
              {erro ?? `Nenhum município encontrado para "${termo}".`}
            </li>
          )}
        </ul>
      )}

      {erro && !aberto && <p className="mt-1.5 text-xs text-rose-400">{erro}</p>}
    </div>
  );
}
