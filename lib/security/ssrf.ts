import { lookup } from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata"]);

function isPrivateIp(ip: string) {
  if (ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  const v4 = ip.includes(".") ? ip : null;
  if (!v4) return false;
  const parts = v4.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export async function assertPublicHttpUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Ungültige URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Nur http(s)-URLs sind erlaubt.");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Interne URLs sind nicht erlaubt.");
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Interne URLs sind nicht erlaubt.");
    return;
  }
  const resolved = await lookup(host, { all: true, verbatim: true });
  if (resolved.length === 0 || resolved.some((item) => isPrivateIp(item.address))) {
    throw new Error("Interne URLs sind nicht erlaubt.");
  }
}

export async function fetchPublicUrl(url: string, init?: RequestInit, hops = 0): Promise<Response> {
  if (hops > 3) throw new Error("Zu viele Weiterleitungen.");
  await assertPublicHttpUrl(url);
  const response = await fetch(url, { ...init, redirect: "manual" });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("Ungültige Weiterleitung.");
    return fetchPublicUrl(new URL(location, url).toString(), init, hops + 1);
  }
  return response;
}
