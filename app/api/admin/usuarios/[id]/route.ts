import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarSessao, exigirAdmin, gerarHash } from "@/lib/auth";
import { mensagemDeErro, statusDoErro } from "@/lib/erros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITE_CREDITOS = 10_000_000;

const SENHA_MINIMA = 6;

/** Atualiza nome, e-mail, senha, créditos e/ou perfil de uma conta. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await exigirAdmin();
    const { id } = await params;
    const body = await req.json();

    const data: {
      name?: string;
      email?: string;
      password?: string;
      passwordChangedAt?: Date;
      credits?: number;
      role?: string;
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new Error("Informe o nome do usuário.");
      data.name = name;
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Informe um e-mail válido.");
      }
      const emUso = await prisma.user.findUnique({ where: { email } });
      if (emUso && emUso.id !== id) {
        throw new Error("Já existe uma conta com esse e-mail.");
      }
      data.email = email;
    }

    let trocouSenha = false;
    if (body.password !== undefined && String(body.password) !== "") {
      const password = String(body.password);
      if (password.length < SENHA_MINIMA) {
        throw new Error(
          `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
        );
      }
      data.password = await gerarHash(password);
      // Derruba as sessões abertas com a senha antiga.
      data.passwordChangedAt = new Date();
      trocouSenha = true;
    }

    if (body.credits !== undefined) {
      const credits = Number(body.credits);
      if (!Number.isInteger(credits) || credits < 0 || credits > LIMITE_CREDITOS) {
        throw new Error(
          `Créditos devem ser um número inteiro entre 0 e ${LIMITE_CREDITOS.toLocaleString("pt-BR")}.`
        );
      }
      data.credits = credits;
    }

    if (body.role !== undefined) {
      if (body.role !== "user" && body.role !== "admin") {
        throw new Error("Perfil inválido.");
      }
      // Sem isso o único admin poderia se rebaixar e trancar o painel.
      if (id === admin.id && body.role !== "admin") {
        throw new Error("Você não pode remover o seu próprio acesso de admin.");
      }
      data.role = body.role;
    }

    if (Object.keys(data).length === 0) throw new Error("Nada para atualizar.");

    const usuario = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, credits: true },
    });

    // Trocou a própria senha: reemite o cookie para não se deslogar sozinho.
    if (trocouSenha && id === admin.id) await criarSessao(admin.id);

    return NextResponse.json({ usuario, sessoesEncerradas: trocouSenha });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) === 500 ? 400 : statusDoErro(error) }
    );
  }
}

/** Exclui a conta e, em cascata, as pesquisas, extrações e leads dela. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await exigirAdmin();
    const { id } = await params;

    if (id === admin.id) throw new Error("Você não pode excluir a própria conta.");

    const { count } = await prisma.user.deleteMany({ where: { id } });
    if (count === 0) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: mensagemDeErro(error) },
      { status: statusDoErro(error) === 500 ? 400 : statusDoErro(error) }
    );
  }
}
