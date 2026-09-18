"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

export default function ModalConfirmacao({
  titulo,
  descricao,
  confirmarTexto = "Excluir",
  onFechar,
  onConfirmar,
}: {
  titulo: string;
  descricao: React.ReactNode;
  confirmarTexto?: string;
  onFechar: () => void;
  onConfirmar: () => Promise<void>;
}) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !excluindo) onFechar();
    }

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [excluindo, onFechar]);

  async function confirmar() {
    if (excluindo) return;
    setExcluindo(true);
    setErro(null);

    try {
      await onConfirmar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível excluir.");
      setExcluindo(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !excluindo) onFechar();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-confirmacao"
        className="my-auto w-full max-w-md rounded-2xl border border-rose-400/15 bg-slate-950 p-6 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 id="titulo-confirmacao" className="text-lg font-semibold text-white">
                {titulo}
              </h2>
              <div className="mt-1.5 text-sm leading-relaxed text-slate-400">
                {descricao}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            disabled={excluindo}
            title="Fechar"
            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {erro && (
          <p className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
            {erro}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onFechar}
            disabled={excluindo}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={excluindo}
            className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {excluindo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {excluindo ? "Excluindo..." : confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}
