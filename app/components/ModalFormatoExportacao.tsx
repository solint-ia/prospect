"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import type { FormatoCsv } from "@/lib/csv";

const OPCOES: {
  valor: FormatoCsv;
  titulo: string;
  descricao: string;
  exemplo: string;
}[] = [
  {
    valor: "agrupado",
    titulo: "Agrupado",
    descricao:
      "Uma linha por sócio. Todos os telefones ficam em uma célula, separados por ponto e vírgula.",
    exemplo: "(51) 9000-0001 [A0][WhatsApp]; (51) 9000-0002 [A0]",
  },
  {
    valor: "linhas",
    titulo: "Números por linha",
    descricao:
      "Uma linha por telefone. Colunas separadas de Classificação e WhatsApp.",
    exemplo: "Empresa A | Sócio X | (51) 9000-0001 | A0 | Sim",
  },
];

export default function ModalFormatoExportacao({
  total,
  onFechar,
  onConfirmar,
}: {
  total: number;
  onFechar: () => void;
  onConfirmar: (formato: FormatoCsv) => void;
}) {
  const [formato, setFormato] = useState<FormatoCsv>("linhas");

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-formato"
        className="my-auto w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/60"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="titulo-formato" className="text-xl font-semibold text-white">
              Formato da Exportação
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Escolha como os números de telefone serão organizados na planilha.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            title="Fechar"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <fieldset className="space-y-3">
          <legend className="sr-only">Formato do arquivo</legend>

          {OPCOES.map((o) => {
            const ativa = formato === o.valor;
            return (
              <label
                key={o.valor}
                className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3.5 transition ${
                  ativa
                    ? "border-emerald-400/50 bg-emerald-400/5"
                    : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                }`}
              >
                <input
                  type="radio"
                  name="formato-csv"
                  value={o.valor}
                  checked={ativa}
                  onChange={() => setFormato(o.valor)}
                  className="mt-1 h-4 w-4 shrink-0 accent-emerald-400"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-white">{o.titulo}</span>
                  <span className="mt-1 block text-sm leading-snug text-slate-400">
                    {o.descricao}
                  </span>
                  <span className="mt-2 block break-words font-mono text-[11px] leading-snug text-slate-500">
                    Ex: {o.exemplo}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(formato)}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Download className="h-4 w-4" />
            Baixar CSV
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          {total.toLocaleString("pt-BR")} {total === 1 ? "lead" : "leads"} na
          exportação
        </p>
      </div>
    </div>
  );
}
