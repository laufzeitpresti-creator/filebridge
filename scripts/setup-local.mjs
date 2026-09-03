#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const examplePath = join(root, ".env.example");

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
}

function readEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return out;
}

function setEnv(key, value) {
  let text = readFileSync(envPath, "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) {
    text = text.replace(re, `${key}=${value}`);
  } else {
    text += `\n${key}=${value}\n`;
  }
  writeFileSync(envPath, text);
}

const env = readEnv(envPath);
if (!env.FILEBRIDGE_KMS_KEY) {
  setEnv("FILEBRIDGE_KMS_KEY", randomBytes(32).toString("hex"));
}
if (!env.DATABASE_URL || env.DATABASE_URL.includes("filebridge:filebridge@localhost")) {
  setEnv("DATABASE_URL", "file:./data/filebridge.db");
}

const clerkEmpty = !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !env.CLERK_SECRET_KEY;
if (clerkEmpty) {
  execFileSync("npx", ["-y", "clerk@latest", "init", "--accountless", "-y", "--no-skills", "--framework", "next", "--pm", "npm"], {
    cwd: root,
    stdio: "inherit",
  });
  const candidates = [
    readEnv(join(root, ".env")),
    readEnv(join(root, ".env.development.local")),
    readEnv(envPath),
  ];
  const publishable = candidates.map((item) => item.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).find(Boolean);
  const secret = candidates.map((item) => item.CLERK_SECRET_KEY).find(Boolean);
  if (publishable) setEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", publishable);
  if (secret) setEnv("CLERK_SECRET_KEY", secret);
}

console.log("Local env is ready. Next: npm run db:push && npm run dev");
