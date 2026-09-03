import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { transfers } from "@/lib/db/schema";
import { jsonError, requireUserId } from "@/lib/http";
import { publicTransfer } from "@/lib/transfers/serialize";
import { uuidParam } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Ungültige ID.");
  const [job] = await getDb()
    .select()
    .from(transfers)
    .where(and(eq(transfers.id, id), eq(transfers.userId, auth.userId)))
    .limit(1);
  if (!job) return jsonError("Transfer nicht gefunden.", 404);
  return NextResponse.json({ transfer: publicTransfer(job) });
}
