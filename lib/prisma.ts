import { PrismaClient } from "@prisma/client";

/**
 * Em dev o hot reload recria os módulos a cada mudança; sem o cache global
 * o pool de conexões do Supabase estoura em poucos minutos.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
