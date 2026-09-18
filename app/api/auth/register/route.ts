import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarSessao, gerarHash } from "@/lib/auth";
import { mensagemDeErro } from "@/lib/erros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CREDITOS_INICIAIS = 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!name) throw new Error("Informe o seu nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Informe um e-mail válido.");
    if (password.length < 6)
      throw new Error("A senha precisa ter pelo menos 6 caracteres.");

    const jaExiste = await prisma.user.findUnique({ where: { email } });
    if (jaExiste) throw new Error("Já existe uma conta com esse e-mail.");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await gerarHash(password),
        credits: CREDITOS_INICIAIS,
      },
      select: { id: true, name: true, email: true, credits: true },
    });

    await criarSessao(user.id);

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: mensagemDeErro(error) }, { status: 400 });
  }
}
