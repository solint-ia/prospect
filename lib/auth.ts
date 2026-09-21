import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_SESSAO = "prospect_sessao";
const DIAS = 7;

export type Perfil = "user" | "admin";

export interface UsuarioSessao {
  id: string;
  name: string;
  email: string;
  credits: number;
  role: Perfil;
}

export const ehAdmin = (u: { role: string } | null | undefined) =>
  u?.role === "admin";

function segredo(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET não definido no .env");
  return s;
}

export function gerarHash(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/** Grava o JWT num cookie httpOnly — o token nunca fica acessível ao JS da página. */
export async function criarSessao(userId: string): Promise<void> {
  const token = jwt.sign({ sub: userId }, segredo(), { expiresIn: `${DIAS}d` });

  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS * 24 * 60 * 60,
  });
}

export async function encerrarSessao(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSAO);
}

/** Lê o cookie, valida o JWT e devolve o usuário do banco (null se inválido). */
export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;

  let userId: string;
  let emitidoEm: number | null = null; // segundos, como vem do JWT
  try {
    const payload = jwt.verify(token, segredo()) as { sub?: string; iat?: number };
    if (!payload.sub) return null;
    userId = payload.sub;
    emitidoEm = typeof payload.iat === "number" ? payload.iat : null;
  } catch {
    return null; // expirado ou adulterado
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      credits: true,
      role: true,
      passwordChangedAt: true,
    },
  });

  if (!user) return null;

  // Trocou a senha? Quem ainda estiver com um token antigo perde o acesso.
  // A comparação é em segundos cheios porque o `iat` do JWT não tem
  // milissegundos: o token reemitido logo após a troca cai no mesmo segundo
  // e sobrevive, enquanto os anteriores ficam para trás.
  if (user.passwordChangedAt && emitidoEm !== null) {
    const trocaEmSegundos = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (trocaEmSegundos > emitidoEm) return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    credits: user.credits,
    role: user.role === "admin" ? "admin" : "user",
  };
}

/** Igual ao usuarioAtual, mas explode em vez de devolver null. Para uso nas rotas. */
export async function exigirUsuario(): Promise<UsuarioSessao> {
  const user = await usuarioAtual();
  if (!user) throw new NaoAutenticado();
  return user;
}

/** Para as rotas /api/admin: sessão válida e perfil admin, senão 401/403. */
export async function exigirAdmin(): Promise<UsuarioSessao> {
  const user = await exigirUsuario();
  if (!ehAdmin(user)) throw new SemPermissao();
  return user;
}

export class SemPermissao extends Error {
  constructor() {
    super("Acesso restrito a administradores.");
    this.name = "SemPermissao";
  }
}

export class NaoAutenticado extends Error {
  constructor() {
    super("Sessão expirada. Faça login novamente.");
    this.name = "NaoAutenticado";
  }
}
