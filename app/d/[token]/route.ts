import { NextResponse } from "next/server";
import { ShareConnector } from "@/lib/connectors/fs";
import { jsonError, limitIp, tooManyRequests } from "@/lib/http";
import { readShareToken } from "@/lib/share/token";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!limitIp(request, "share", 30, 60_000)) return tooManyRequests();
  try {
    const { token } = await context.params;
    const payload = readShareToken(decodeURIComponent(token));
    const connector = new ShareConnector({ userId: payload.userId });
    const { stream, name, size } = await connector.read(payload.path);
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(payload.name || name)}"`,
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        ...(size != null ? { "Content-Length": String(size) } : {}),
      },
    });
  } catch {
    return jsonError("Link ungültig oder abgelaufen.", 404);
  }
}
