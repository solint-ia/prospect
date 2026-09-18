import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, gerarHash } from "@/lib/auth";
import { carregarPainelAdmin } from "@/lib/admin";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CREDITOS_INICIAIS = 1000;

export async function GET() {
  try {
    await exigirAdmin();
    return NextResponse.json(await carregarPainelAdmin());
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) }
    );
  }
}

export async function POST(req: Request) {
  try {
    await exigirAdmin();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!name) throw new Error("Informe o nome do usuário.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }
    if (password.length < 6) {
      throw new Error("A senha precisa ter pelo menos 6 caracteres.");
    }

    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) throw new Error("Já existe uma conta com esse e-mail.");

    const usuario = await prisma.user.create({
      data: {
        name,
        email,
        password: await gerarHash(password),
        role: "user",
        credits: CREDITOS_INICIAIS,
      },
      select: { id: true, name: true, email: true, role: true, credits: true },
    });

    return NextResponse.json({ usuario }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) === 500 ? 400 : statusDoErro(error) }
    );
  }
}
