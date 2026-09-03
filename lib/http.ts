import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export async function requireUserId(): Promise<
  { userId: string; error?: undefined } | { userId?: undefined; error: NextResponse }
> {
  const { userId } = await auth();
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }),
    };
  }
  return { userId };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function tooManyRequests() {
  return jsonError("Zu viele Anfragen. Bitte kurz warten.", 429);
}

export function limitUser(userId: string, action: string, limit: number, windowMs: number) {
  return rateLimit(`${action}:${userId}`, limit, windowMs);
}

export function limitIp(request: Request, action: string, limit: number, windowMs: number) {
  return rateLimit(`${action}:${clientIp(request)}`, limit, windowMs);
}

export async function readJson(
  request: Request,
): Promise<{ body: unknown; error?: undefined } | { body?: undefined; error: NextResponse }> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { error: jsonError("Ungültiger Content-Type.", 415) };
  }
  try {
    return { body: await request.json() };
  } catch {
    return { error: jsonError("Ungültiges JSON.") };
  }
}
