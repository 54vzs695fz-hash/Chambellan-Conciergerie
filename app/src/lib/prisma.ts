import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is required");
  }

  if (
    databaseUrl.startsWith("prisma://") ||
    databaseUrl.startsWith("prisma+postgres://")
  ) {
    return new PrismaClient({ accelerateUrl: databaseUrl }).$extends(
      withAccelerate()
    ) as unknown as PrismaClient;
  }

  const directUrl =
    process.env.POSTGRES_URL ??
    process.env.DIRECT_DATABASE_URL ??
    databaseUrl;

  const adapter = new PrismaPg({
    connectionString: directUrl,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
