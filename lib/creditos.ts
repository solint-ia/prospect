import { prisma } from "./prisma";
import { criarAlieviService } from "./alievi";
import { ehAdmin, type UsuarioSessao } from "./auth";

/**
 * Dois saldos convivem na aplicação:
 * - admin: o saldo real da conta Alievi, lido no login da plataforma;
 * - usuário: o campo `credits` do banco, que o admin distribui.
 * 1 lead extraído = 1 crédito, nos dois lados.
 */

const TTL_SALDO_MS = 30_000;
let cacheAlievi: { valor: number; expiraEm: number } | null = null;

/** Saldo da conta Alievi. O cache curto evita um login na Alievi a cada página. */
export async function saldoAlievi(): Promise<number> {
  if (cacheAlievi && Date.now() < cacheAlievi.expiraEm) return cacheAlievi.valor;

  const valor = await criarAlieviService().saldo();
  cacheAlievi = { valor, expiraEm: Date.now() + TTL_SALDO_MS };
  return valor;
}

/** Chamar depois de qualquer extração: o saldo da Alievi mudou. */
export function invalidarSaldoAlievi(): void {
  cacheAlievi = null;
}

/** O número que o cabeçalho mostra. Null quando a Alievi não responde. */
export async function creditosExibidos(
  usuario: UsuarioSessao
): Promise<number | null> {
  if (!ehAdmin(usuario)) return usuario.credits;
  try {
    return await saldoAlievi();
  } catch {
    return null;
  }
}

export class SaldoInsuficiente extends Error {
  constructor(saldo: number, pedido: number) {
    super(
      `Saldo insuficiente: você tem ${saldo.toLocaleString("pt-BR")} créditos e pediu ${pedido.toLocaleString("pt-BR")} leads.`
    );
    this.name = "SaldoInsuficiente";
  }
}

/**
 * Reserva os créditos antes de chamar a Alievi. O `credits >= n` no where torna
 * a checagem e o débito uma operação só no banco: duas extrações simultâneas
 * não conseguem gastar o mesmo saldo.
 */
export async function reservarCreditos(userId: string, n: number): Promise<void> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: n } },
    data: { credits: { decrement: n } },
  });

  if (count === 0) {
    const atual = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    throw new SaldoInsuficiente(atual?.credits ?? 0, n);
  }
}

/** Devolve o que foi reservado e não virou lead (falha ou entrega parcial). */
export async function estornarCreditos(userId: string, n: number): Promise<void> {
  if (n <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: n } },
  });
}
