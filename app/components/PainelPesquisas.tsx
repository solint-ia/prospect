"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  Download,
  FolderOpen,
  MapPin,
  Plus,
  Search,
  Tag,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import ModalNovaPesquisa from "./ModalNovaPesquisa";
import ModalConfirmacao from "./ModalConfirmacao";
import Paginacao from "./Paginacao";
import { botaoPrimarioCls, dataCurta, num, regiaoDaPesquisa } from "./ui";

export interface PesquisaCard {
  id: string;
  name: string;
  cnae: string;
  state: string | null;
  municipioNome: string | null;
  cnaesSecundarios: string[];
  estimatedLeads: number | null;
  estimatedCompanies: number | null;
  podeExtrair: boolean;
  extracoes: number;
  createdAt: string;
}

function formatarCnae(cod: string): string {
  return cod.length === 7
    ? `${cod.slice(0, 4)}-${cod.slice(4, 5)}/${cod.slice(5)}`
    : cod;
}

function Card({
  pesquisa,
  onExcluir,
}: {
  pesquisa: PesquisaCard;
  onExcluir: (pesquisa: PesquisaCard) => void;
}) {
  return (
    <article className="group relative flex flex-col rounded-2xl border border-white/10 bg-slate-950/60 transition hover:border-emerald-400/30 hover:bg-slate-900/60">
      <Link
        href={`/pesquisas/${pesquisa.id}`}
        className="flex flex-1 flex-col p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3 pr-9">
          <h3 className="min-w-0 flex-1 font-semibold leading-snug text-white group-hover:text-emerald-300">
            {pesquisa.name}
          </h3>
          <FolderOpen className="h-5 w-5 shrink-0 text-slate-600 transition group-hover:text-emerald-400" />
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-emerald-400">
            <Tag className="h-3 w-3" />
            {formatarCnae(pesquisa.cnae)}
          </span>
          {pesquisa.cnaesSecundarios.length > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-slate-400"
              title={pesquisa.cnaesSecundarios.map(formatarCnae).join(", ")}
            >
              +{pesquisa.cnaesSecundarios.length} CNAE
              {pesquisa.cnaesSecundarios.length > 1 ? "s" : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-slate-300">
            <MapPin className="h-3 w-3" />
            {regiaoDaPesquisa(pesquisa)}
          </span>
          {pesquisa.extracoes > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-300">
              <Download className="h-3 w-3" />
              {pesquisa.extracoes}{" "}
              {pesquisa.extracoes === 1 ? "extração" : "extrações"}
            </span>
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-white/5 pt-3.5">
          <div>
            <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-500">
              <Building2 className="h-3 w-3" />
              Empresas
            </p>
            <p className="text-base font-semibold tabular-nums text-white">
              {num(pesquisa.estimatedCompanies)}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-500">
              <Users className="h-3 w-3" />
              Leads estimados
            </p>
            <p className="text-base font-semibold tabular-nums text-white">
              {num(pesquisa.estimatedLeads)}
            </p>
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="h-3 w-3" />
          Criada em {dataCurta(pesquisa.createdAt)}
        </p>

        {!pesquisa.podeExtrair && (
          <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
            <TriangleAlert className="mt-px h-3 w-3 shrink-0" />
            Pesquisa incompleta — não é possível extrair.
          </p>
        )}
      </Link>

      <button
        type="button"
        onClick={() => onExcluir(pesquisa)}
        title={`Excluir ${pesquisa.name}`}
        aria-label={`Excluir pesquisa ${pesquisa.name}`}
        className="absolute right-3 top-3 rounded-lg p-2 text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  );
}

export default function PainelPesquisas({
  iniciais,
}: {
  iniciais: PesquisaCard[];
}) {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [pesquisaParaExcluir, setPesquisaParaExcluir] =
    useState<PesquisaCard | null>(null);
  const [pesquisas, setPesquisas] = useState(iniciais);
  const [busca, setBusca] = useState("");
  const [campoBusca, setCampoBusca] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(6);

  useEffect(() => setPesquisas(iniciais), [iniciais]);

  const pesquisasFiltradas = useMemo(() => {
    const termo = busca
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    if (!termo) return pesquisas;

    return pesquisas.filter((pesquisa) => {
      const campos: Record<string, string> = {
        nome: pesquisa.name,
        cnae: `${pesquisa.cnae} ${formatarCnae(pesquisa.cnae)}`,
        estado: regiaoDaPesquisa(pesquisa),
      };
      const valores = campoBusca === "todos" ? Object.values(campos) : [campos[campoBusca]];

      return valores.some((valor) =>
        (valor ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(termo)
      );
    });
  }, [busca, campoBusca, pesquisas]);

  const totalPaginas = Math.max(1, Math.ceil(pesquisasFiltradas.length / porPagina));
  const pesquisasDaPagina = pesquisasFiltradas.slice(
    (pagina - 1) * porPagina,
    pagina * porPagina
  );

  useEffect(() => {
    setPagina((atual) => Math.min(atual, totalPaginas));
  }, [totalPaginas]);

  useEffect(() => setPagina(1), [busca, campoBusca, porPagina]);

  async function excluirPesquisa() {
    if (!pesquisaParaExcluir) return;

    const res = await fetch(`/api/pesquisas/${pesquisaParaExcluir.id}`, {
      method: "DELETE",
    });
    const ehJson = (res.headers.get("content-type") ?? "").includes(
      "application/json"
    );
    const data = ehJson ? ((await res.json()) as { error?: string }) : {};

    if (!res.ok) {
      throw new Error(data.error ?? `Não foi possível excluir (HTTP ${res.status}).`);
    }

    const idExcluido = pesquisaParaExcluir.id;
    setPesquisas((atuais) => atuais.filter((pesquisa) => pesquisa.id !== idExcluido));
    setPesquisaParaExcluir(null);
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Minhas pesquisas
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {pesquisas.length === 0
              ? "Nenhuma pesquisa ainda."
              : `${pesquisas.length} ${pesquisas.length === 1 ? "pesquisa" : "pesquisas"} criadas.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className={`${botaoPrimarioCls} py-3`}
        >
          <Plus className="h-5 w-5" />
          Nova Pesquisa
        </button>
      </div>

      {pesquisas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 px-6 py-16 text-center">
          <FolderOpen className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="font-medium text-white">Comece criando uma pesquisa</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-400">
            Escolha um CNAE, um estado e a faixa de capital social. Mostramos
            quantas oportunidades existem antes de você extrair qualquer contato.
          </p>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className={`${botaoPrimarioCls} mx-auto mt-6 py-3`}
          >
            <Plus className="h-5 w-5" />
            Nova Pesquisa
          </button>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Busca rápida</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Busca rápida..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/10"
              />
            </label>

            <select
              value={campoBusca}
              onChange={(evento) => setCampoBusca(evento.target.value)}
              aria-label="Campo da busca"
              className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-emerald-400/40 focus:outline-none"
            >
              <option value="todos">Todos os campos</option>
              <option value="nome">Nome</option>
              <option value="cnae">CNAE</option>
              <option value="estado">Estado</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-500">
              Exibir
              <select
                value={porPagina}
                onChange={(evento) => setPorPagina(Number(evento.target.value))}
                className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-sm text-slate-300 focus:border-emerald-400/40 focus:outline-none"
              >
                {[6, 12, 24].map((quantidade) => (
                  <option key={quantidade} value={quantidade}>
                    {quantidade}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {pesquisasDaPagina.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-slate-600" />
              <p className="font-medium text-white">Nenhuma pesquisa encontrada</p>
              <p className="mt-1 text-sm text-slate-500">
                Tente outro termo ou selecione todos os campos.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pesquisasDaPagina.map((pesquisa) => (
                <Card
                  key={pesquisa.id}
                  pesquisa={pesquisa}
                  onExcluir={setPesquisaParaExcluir}
                />
              ))}
            </div>
          )}

          <Paginacao
            pagina={pagina}
            totalPaginas={totalPaginas}
            totalItens={pesquisasFiltradas.length}
            porPagina={porPagina}
            onMudar={setPagina}
            className="mt-5 rounded-xl border border-white/10 bg-slate-950/40"
          />
        </>
      )}

      {modalAberto && (
        <ModalNovaPesquisa
          onFechar={() => setModalAberto(false)}
          onCriada={() => router.refresh()}
        />
      )}

      {pesquisaParaExcluir && (
        <ModalConfirmacao
          titulo="Excluir pesquisa?"
          descricao={
            <>
              A pesquisa <strong className="text-slate-200">{pesquisaParaExcluir.name}</strong>,
              todas as suas extrações e todos os leads serão removidos permanentemente.
              Créditos utilizados não serão devolvidos.
            </>
          }
          confirmarTexto="Excluir pesquisa"
          onFechar={() => setPesquisaParaExcluir(null)}
          onConfirmar={excluirPesquisa}
        />
      )}
    </main>
  );
}
