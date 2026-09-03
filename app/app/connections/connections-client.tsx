"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FtpForm,
  HttpForm,
  S3Form,
  SftpForm,
  WebDavForm,
} from "@/components/connection-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONNECTORS } from "@/lib/connectors/catalog";

type Connection = {
  id: string;
  kind: string;
  name: string;
  createdAt: string;
};

type OauthFlags = {
  onedrive: boolean;
  google: boolean;
  dropbox: boolean;
  box: boolean;
};

const oauthHref: Record<string, string> = {
  onedrive: "/api/onedrive/start",
  google: "/api/oauth/google/start",
  dropbox: "/api/oauth/dropbox/start",
  box: "/api/oauth/box/start",
};

export function ConnectionsClient({ oauth }: { oauth: OauthFlags }) {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Connection[]>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/connections");
    const json = (await response.json()) as { connections?: Connection[] };
    setItems(json.connections ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) toast.error(error);
    const connected = searchParams.get("connected");
    if (connected) {
      toast.success("Cloud verbunden");
      void load();
    }
  }, [searchParams, load]);

  async function remove(id: string) {
    const response = await fetch(`/api/connections/${id}`, { method: "DELETE" });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(json.error || "Löschen fehlgeschlagen");
      return;
    }
    toast.success("Verbindung entfernt");
    await load();
  }

  async function test(id: string) {
    const response = await fetch(`/api/connections/${id}/test`, { method: "POST" });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(json.error || "Test fehlgeschlagen");
      return;
    }
    toast.success("Verbindung ok");
  }

  const clouds = CONNECTORS.filter((item) => item.group === "cloud");

  return (
    <Tabs defaultValue="cloud">
      <TabsList>
        <TabsTrigger value="cloud">Clouds</TabsTrigger>
        <TabsTrigger value="server">Server</TabsTrigger>
        <TabsTrigger value="device">Gerät & Links</TabsTrigger>
      </TabsList>

      <TabsContent value="cloud" className="grid gap-4 sm:grid-cols-2">
        {clouds.map((item) => {
          const ready = oauth[item.kind as keyof OauthFlags];
          return (
            <Card key={item.kind}>
              <CardHeader>
                <CardTitle>{item.label}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {ready ? (
                  <Button asChild>
                    <a href={oauthHref[item.kind]}>{item.label} verbinden</a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {item.kind === "onedrive"
                      ? "MICROSOFT_CLIENT_ID und MICROSOFT_CLIENT_SECRET setzen."
                      : `${item.kind.toUpperCase()}_CLIENT_ID und SECRET in .env.local setzen.`}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </TabsContent>

      <TabsContent value="server" className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SFTP</CardTitle>
            <CardDescription>SSH auf VPS, NAS, Hetzner.</CardDescription>
          </CardHeader>
          <CardContent>
            <SftpForm onCreated={() => void load()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>FTP / FTPS</CardTitle>
            <CardDescription>Klassische Hosting-Zugänge.</CardDescription>
          </CardHeader>
          <CardContent>
            <FtpForm onCreated={() => void load()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>WebDAV</CardTitle>
            <CardDescription>Nextcloud, ownCloud, Dateien-App auf dem iPhone.</CardDescription>
          </CardHeader>
          <CardContent>
            <WebDavForm onCreated={() => void load()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>S3 / R2 / MinIO</CardTitle>
            <CardDescription>Object Storage, S3-kompatibel.</CardDescription>
          </CardHeader>
          <CardContent>
            <S3Form onCreated={() => void load()} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="device" className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dieses Gerät</CardTitle>
            <CardDescription>
              Im Transfer-Wizard eine Datei vom Computer oder Handy hochladen. Wird automatisch angelegt.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Link für iPhone & Co.</CardTitle>
            <CardDescription>
              Ziel „Link für iPhone“ wählen. Danach erscheint in den Jobs ein Download-Link für 7 Tage.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>HTTP(S)-URL</CardTitle>
            <CardDescription>Eine Datei direkt per öffentlichem Link holen.</CardDescription>
          </CardHeader>
          <CardContent>
            <HttpForm onCreated={() => void load()} />
          </CardContent>
        </Card>
      </TabsContent>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Gespeicherte Verbindungen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Verbindungen.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <Badge variant="secondary">{labelFor(item.kind)}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => test(item.id)}>
                    Testen
                  </Button>
                  {item.kind !== "local" && item.kind !== "share" ? (
                    <Button size="sm" variant="destructive" onClick={() => remove(item.id)}>
                      Entfernen
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </Tabs>
  );
}

function labelFor(kind: string) {
  return CONNECTORS.find((item) => item.kind === kind)?.label || kind;
}
