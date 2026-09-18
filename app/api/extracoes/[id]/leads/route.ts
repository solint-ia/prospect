import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/lib/auth";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";
import { extracaoPublica } from "@/lib/publico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Leads já persistidos de uma extração, para a tabela e o export CSV. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await exigirUsuario();
    const { id } = await params;

    const extracao = await prisma.extraction.findFirst({
      where: { id, userId: user.id },
      include: {
        research: { select: { name: true, cnae: true, state: true } },
        leads: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!extracao) {
      return NextResponse.json({ error: "Extração não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ extracao: extracaoPublica(extracao) });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}
