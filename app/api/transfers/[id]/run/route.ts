import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { transfers } from "@/lib/db/schema";
import { jsonError, limitUser, requireUserId, tooManyRequests } from "@/lib/http";
import { runTransfer } from "@/lib/transfers/run-transfer";
import { publicTransfer } from "@/lib/transfers/serialize";
import { uuidParam } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  if (!limitUser(auth.userId, "transfer-run", 20, 60_000)) return tooManyRequests();
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Ungültige ID.");
  const [job] = await getDb()
    .select({ id: transfers.id })
    .from(transfers)
    .where(and(eq(transfers.id, id), eq(transfers.userId, auth.userId)))
    .limit(1);
  if (!job) return jsonError("Transfer nicht gefunden.", 404);
  try {
    await runTransfer(auth.userId, id);
    const [fresh] = await getDb()
      .select()
      .from(transfers)
      .where(and(eq(transfers.id, id), eq(transfers.userId, auth.userId)))
      .limit(1);
    return NextResponse.json({ transfer: fresh ? publicTransfer(fresh) : null });
  } catch {
    return jsonError("Transfer fehlgeschlagen.", 500);
  }
}
