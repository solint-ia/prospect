export const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition focus:border-emerald-400/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-60";

export const botaoPrimarioCls =
  "flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-emerald-500/40 disabled:text-slate-950/70";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

export const num = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR");

export const dataCurta = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const dataHora = (iso: string | Date) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function Campo({
  label,
  dica,
  className = "",
  children,
}: {
  label: string;
  dica?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </span>
      {children}
      {dica && <span className="mt-1.5 block text-xs text-slate-500">{dica}</span>}
    </label>
  );
}
