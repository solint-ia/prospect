"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  Coins,
  History,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";
import { num } from "./ui";

export interface Usuario {
  id: string;
  name: string;
  email: string;
  credits: number;
  role: "user" | "admin";
}

export default function Cabecalho({
  usuario,
  creditos,
}: {
  usuario: Usuario;
  /** Admin: saldo total da conta. Usuário: saldo do banco. Null = saldo indisponível. */
  creditos: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [saindo, setSaindo] = useState(false);
  const admin = usuario.role === "admin";

  async function sair() {
    setSaindo(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const linkCls = (ativo: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
      ativo
        ? "bg-white/10 text-white"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-4">
        <Link href="/dashboard" className="mr-auto min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400/80">
            Prospect
          </p>
          <p className="truncate text-lg font-semibold text-white">
            Extrator de Leads B2B
          </p>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className={linkCls(pathname !== "/admin" && pathname !== "/creditos")}
          >
            <LayoutGrid className="h-4 w-4" />
            Pesquisas
          </Link>
          <Link href="/creditos" className={linkCls(pathname === "/creditos")}>
            <History className="h-4 w-4" />
            Créditos
          </Link>
          {admin && (
            <Link href="/admin" className={linkCls(pathname === "/admin")}>
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        <div
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2"
          title={
            admin
              ? "Saldo total da conta"
              : "Seus créditos: 1 lead extraído = 1 crédito"
          }
        >
          <Coins className="h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              {admin ? "Créditos da conta" : "Créditos"}
            </p>
            <p className="text-sm font-semibold tabular-nums text-white">
              {creditos === null ? (
                <span className="text-rose-400">Indisponível</span>
              ) : (
                num(creditos)
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2">
          {admin ? (
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
          ) : (
            <User className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
              {usuario.name}
              {admin && (
                <span className="rounded bg-amber-400/15 px-1.5 py-px text-[10px] font-semibold uppercase text-amber-300">
                  Admin
                </span>
              )}
            </p>
            <p className="truncate text-[11px] text-slate-500">{usuario.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          title="Sair"
          className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
