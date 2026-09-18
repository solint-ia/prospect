import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { conferirSenha, criarSessao } from "@/lib/auth";
import { mensagemDeErro } from "@/lib/erros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) throw new Error("Informe e-mail e senha.");

    const user = await prisma.user.findUnique({ where: { email } });

    // Mesma mensagem nos dois casos: não revela quais e-mails existem.
    if (!user || !(await conferirSenha(password, user.password))) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    await criarSessao(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        credits: user.credits,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: mensagemDeErro(error) }, { status: 400 });
  }
}
