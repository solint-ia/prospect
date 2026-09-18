"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Paginacao({
  pagina,
  totalPaginas,
  totalItens,
  porPagina,
  onMudar,
  className = "",
}: {
  pagina: number;
  totalPaginas: number;
  totalItens: number;
  porPagina: number;
  onMudar: (pagina: number) => void;
  className?: string;
}) {
  if (totalItens === 0) return null;

  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, totalItens);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 ${className}`}
    >
      <p className="text-xs text-slate-500">
        Exibindo <span className="font-medium text-slate-300">{inicio}–{fim}</span> de{" "}
        <span className="font-medium text-slate-300">{totalItens}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onMudar(pagina - 1)}
          disabled={pagina <= 1}
          aria-label="Página anterior"
          className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-24 text-center text-xs text-slate-400">
          Página <strong className="font-semibold text-white">{pagina}</strong> de{" "}
          {totalPaginas}
        </span>
        <button
          type="button"
          onClick={() => onMudar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          aria-label="Próxima página"
          className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
