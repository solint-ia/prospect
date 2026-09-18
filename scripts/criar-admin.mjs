/**
 * Cria uma conta de admin, ou promove uma conta existente.
 *
 *   npm run admin:criar -- <email> <senha> [nome]
 *
 * Se o e-mail já existe, a conta vira admin e a senha é trocada pela informada.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const [email, senha, ...resto] = process.argv.slice(2);
const nome = resto.join(" ") || "Administrador";

if (!email || !senha) {
  console.error("Uso: npm run admin:criar -- <email> <senha> [nome]");
  process.exit(1);
}
if (senha.length < 8) {
  console.error("A senha do admin precisa ter pelo menos 8 caracteres.");
  process.exit(1);
}

const prisma = new PrismaClient();
const emailNormalizado = email.trim().toLowerCase();
const hash = await bcrypt.hash(senha, 10);

const existente = await prisma.user.findUnique({ where: { email: emailNormalizado } });

const admin = existente
  ? await prisma.user.update({
      where: { id: existente.id },
      data: { role: "admin", password: hash },
    })
  : await prisma.user.create({
      // Admin usa o saldo da Alievi; o campo credits dele não é usado.
      data: { name: nome, email: emailNormalizado, password: hash, role: "admin", credits: 0 },
    });

console.log(
  existente
    ? `Conta existente promovida a admin: ${admin.email}`
    : `Admin criado: ${admin.email}`
);
await prisma.$disconnect();
