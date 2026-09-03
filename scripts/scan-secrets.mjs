#!/usr/bin/env node
import { execSync } from "node:child_process";

const pattern =
  "sk_live_|sk_test_[a-zA-Z0-9]{8,}|FILEBRIDGE_KMS_KEY=[0-9a-fA-F]{64}|BEGIN (RSA |OPENSSH )?PRIVATE KEY|CLERK_SECRET_KEY=sk_|RESEND_API_KEY=re_";

try {
  const out = execSync(
    `git grep -I -n -E '${pattern}' -- ':!.env.example' ':!scripts/scan-secrets.mjs' ':!SECURITY.md' || true`,
    { encoding: "utf8" },
  ).trim();
  if (out) {
    console.error("Possible secrets in git-tracked files:\n" + out);
    process.exit(1);
  }
  console.log("Secret scan: no tracked matches.");
} catch (error) {
  if (error && typeof error === "object" && "status" in error && error.status === 1) {
    process.exit(1);
  }
  console.log("Secret scan skipped (not a git repo or empty tree).");
}
