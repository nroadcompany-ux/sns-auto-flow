import { PrismaClient } from "@prisma/client"

// DATABASE_URL이 없으면(미설정) DB 없이 동작 — Vercel 배포 시 안전하게 처리
const hasDB = !!process.env.DATABASE_URL && process.env.DATABASE_URL !== "여기에_입력"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma: PrismaClient = hasDB
  ? (globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      }))
  : (null as unknown as PrismaClient)

if (hasDB && process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
