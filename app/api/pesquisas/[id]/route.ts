import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/lib/auth";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";
import { extracaoPublica, pesquisaPublica } from "@/lib/publico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Página de detalhe: a pesquisa e o histórico de extrações dela. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await exigirUsuario();
    const { id } = await params;

    // O userId no where garante que ninguém abra a pesquisa de outra conta.
    const pesquisa = await prisma.research.findFirst({
      where: { id, userId: user.id },
      include: {
        extractions: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { leads: true } } },
        },
      },
    });

    if (!pesquisa) {
      return NextResponse.json({ error: "Pesquisa não encontrada." }, { status: 404 });
    }

    return NextResponse.json({
      pesquisa: {
        ...pesquisaPublica(pesquisa),
        extractions: pesquisa.extractions.map(extracaoPublica),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await exigirUsuario();
    const { id } = await params;

    const pesquisa = await prisma.research.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        extractions: {
          where: { status: "processing" },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!pesquisa) {
      return NextResponse.json({ error: "Pesquisa não encontrada." }, { status: 404 });
    }

    if (pesquisa.extractions.length > 0) {
      return NextResponse.json(
        { error: "Aguarde a extração em andamento terminar antes de excluir a pesquisa." },
        { status: 409 }
      );
    }

    const { count } = await prisma.research.deleteMany({
      where: { id: pesquisa.id, userId: user.id },
    });

    if (count === 0) {
      return NextResponse.json({ error: "Pesquisa não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}
