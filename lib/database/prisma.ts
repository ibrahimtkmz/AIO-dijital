/** Prisma is loaded only when a server route needs data; this keeps builds secret-free. */
export async function getPrisma(): Promise<any> {
  const load = new Function("return import('@prisma/client')") as () => Promise<{ PrismaClient: new () => any }>;
  const { PrismaClient } = await load();
  const globalForPrisma = globalThis as typeof globalThis & { prisma?: any };
  globalForPrisma.prisma ??= new PrismaClient();
  return globalForPrisma.prisma;
}
