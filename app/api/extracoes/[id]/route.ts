import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/lib/auth";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await exigirUsuario();
    const { id } = await params;

    const extracao = await prisma.extraction.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true },
    });

    if (!extracao) {
      return NextResponse.json({ error: "Extração não encontrada." }, { status: 404 });
    }

    if (extracao.status === "processing") {
      return NextResponse.json(
        { error: "Aguarde a extração terminar antes de excluí-la." },
        { status: 409 }
      );
    }

    await prisma.extraction.delete({ where: { id: extracao.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}
