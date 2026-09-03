"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileBrowser } from "@/components/file-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { connectorMeta } from "@/lib/connectors/catalog";
import type { FileEntry } from "@/lib/connectors/types";

type ConnectionOption = {
  id: string;
  name: string;
  kind: string;
};

export function TransferWizard() {
  const router = useRouter();
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [destId, setDestId] = useState<string | null>(null);
  const [file, setFile] = useState<FileEntry | null>(null);
  const [folder, setFolder] = useState<FileEntry | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/connections")
      .then((response) => response.json())
      .then((json: { connections?: ConnectionOption[] }) => {
        setConnections(json.connections ?? []);
      })
      .catch(() => toast.error("Verbindungen konnten nicht geladen werden."));
  }, []);

  const sources = useMemo(
    () => connections.filter((item) => connectorMeta(item.kind)?.canSource),
    [connections],
  );
  const destinations = useMemo(
    () => connections.filter((item) => connectorMeta(item.kind)?.canDest),
    [connections],
  );
  const sourceKind = connections.find((item) => item.id === sourceId)?.kind;
  const destKind = connections.find((item) => item.id === destId)?.kind;

  async function onLocalFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", picked);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const json = (await response.json()) as { error?: string; entry?: FileEntry };
      if (!response.ok || !json.entry) throw new Error(json.error || "Upload fehlgeschlagen");
      setFile(json.entry);
      toast.success("Datei liegt bereit");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function startTransfer() {
    if (!sourceId || !destId || !file) {
      toast.error("Quelle, Datei und Zielordner wählen.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceConnectionId: sourceId,
          destConnectionId: destId,
          sourcePath: file.path,
          destFolder: folder?.path || "root",
          fileName: file.name,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Start fehlgeschlagen");
      toast.success("Transfer gestartet");
      router.push("/app/transfers");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <Label>Quelle</Label>
        <Select
          value={sourceId ?? undefined}
          onValueChange={(value) => {
            setSourceId(value);
            setFile(null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Verbindung wählen" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sourceKind === "local" ? (
          <Input type="file" onChange={onLocalFile} disabled={uploading} />
        ) : (
          <FileBrowser
            connectionId={sourceId}
            mode="file"
            selectedId={file?.id}
            onSelect={(entry) => {
              if (!entry.isDir) setFile(entry);
            }}
          />
        )}
        {file ? (
          <p className="text-sm">
            Datei: <span className="font-medium">{file.name}</span>
          </p>
        ) : null}
      </section>

      <section className="grid gap-3">
        <Label>Ziel</Label>
        <Select
          value={destId ?? undefined}
          onValueChange={(value) => {
            setDestId(value);
            setFolder(null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Verbindung wählen" />
          </SelectTrigger>
          <SelectContent>
            {destinations.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FileBrowser
          connectionId={destId}
          mode="folder"
          selectedId={folder?.id}
          onSelect={(entry) => {
            if (entry.isDir) setFolder(entry);
          }}
        />
        {folder ? (
          <p className="text-sm">
            Ordner: <span className="font-medium">{folder.name}</span>
            {destKind === "share" ? " – danach gibt es einen iPhone-Link." : ""}
          </p>
        ) : null}
      </section>

      <Button size="lg" onClick={startTransfer} disabled={pending || !file || !folder}>
        {pending ? "Starten…" : "Datei übertragen"}
      </Button>
    </div>
  );
}
