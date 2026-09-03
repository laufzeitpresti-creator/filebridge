import { ConnectionsClient } from "./connections-client";
import { oauthFlags } from "@/lib/config";
import { Suspense } from "react";

export default function ConnectionsPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verbindungen</h1>
        <p className="mt-1 text-muted-foreground">
          Cloud, Server, dieses Gerät und iPhone-Links. Zugänge werden verschlüsselt gespeichert.
        </p>
      </div>
      <Suspense>
        <ConnectionsClient oauth={oauthFlags()} />
      </Suspense>
    </div>
  );
}
