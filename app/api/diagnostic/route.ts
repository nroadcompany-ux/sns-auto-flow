import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAnthropicKey } from "@/lib/ai/generate";
import type { DiagnosticCheck, DiagnosticResult } from "@/types";

export const runtime = "nodejs";

/**
 * System self-check. Protected by the SFA_ADMIN_KEY — callers must send it as
 * the `x-sfa-admin-key` header (the /admin page does this for you).
 */
export async function GET(req: Request) {
  const adminKey = process.env.SFA_ADMIN_KEY ?? "";
  const provided = req.headers.get("x-sfa-admin-key") ?? "";

  if (!adminKey || provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks: DiagnosticCheck[] = [];

  // 1) Anthropic key
  checks.push({
    name: "Anthropic API key",
    ok: hasAnthropicKey(),
    detail: hasAnthropicKey()
      ? "Configured — live AI generation enabled."
      : "Missing — content runs in DEMO mode until a key is added.",
  });

  // 2) PayPlay publish credentials
  const payBase = process.env.PAYPLAY_API_BASE ?? "";
  const paySecret = process.env.PAYPLAY_API_SECRET ?? "";
  const payReady = !!payBase && !!paySecret && !payBase.includes("example.com") && !paySecret.includes("REPLACE_ME");
  checks.push({
    name: "PayPlay publish credentials",
    ok: payReady,
    detail: payReady
      ? "Configured — live publishing enabled."
      : "Placeholder values — publishing runs in DEMO mode.",
  });

  // 3) Database connectivity
  let dbOk = false;
  let dbDetail = "";
  try {
    const count = await prisma.content.count();
    dbOk = true;
    dbDetail = `Connected. ${count} content row(s).`;
  } catch (err) {
    dbDetail = err instanceof Error ? err.message : "DB error";
  }
  checks.push({ name: "Database", ok: dbOk, detail: dbDetail });

  // 4) Secret hardening reminder
  const weakSecrets = ["NEXTAUTH_SECRET", "PAYPLAY_API_SECRET", "SFA_ADMIN_KEY"].filter((k) =>
    (process.env[k] ?? "").includes("REPLACE_ME")
  );
  checks.push({
    name: "Secret hardening",
    ok: weakSecrets.length === 0,
    detail:
      weakSecrets.length === 0
        ? "No placeholder secrets detected."
        : `Replace placeholder values: ${weakSecrets.join(", ")}.`,
  });

  const result: DiagnosticResult = {
    ok: checks.every((c) => c.ok),
    checkedAt: new Date().toISOString(),
    checks,
  };
  return NextResponse.json(result);
}
