import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { connectorFromRow } from "@/lib/connectors/resolve";
import { MAX_UPLOAD_BYTES } from "@/lib/config";
import { getDb } from "@/lib/db";
import { connections } from "@/lib/db/schema";
import { jsonError, limitUser, requireUserId, tooManyRequests } from "@/lib/http";
import { safeFileName } from "@/lib/storage/paths";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  if (!limitUser(auth.userId, "upload", 20, 60_000)) return tooManyRequests();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("Bitte eine Datei wählen.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError(`Datei zu groß (max. ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`, 413);
  }
  let name: string;
  try {
    name = safeFileName(file.name);
  } catch {
    return jsonError("Ungültiger Dateiname.");
  }
  const [row] = await getDb()
    .select()
    .from(connections)
    .where(and(eq(connections.userId, auth.userId), eq(connections.kind, "local")))
    .limit(1);
  if (!row) return jsonError("Lokale Verbindung fehlt.", 500);
  const connector = connectorFromRow(row);
  const dest = `/${name}`;
  await connector.write(dest, file.stream(), { size: file.size });
  return NextResponse.json({
    entry: { id: dest, name, path: dest, isDir: false, size: file.size },
  });
}
