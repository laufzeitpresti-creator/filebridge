"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileBrowser } from "@/components/file-browser";
import { FadeIn } from "@/components/fade-in";
import FileUpload from "@/components/kokonutui/file-upload";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type ConnectionOption = {
  id: string;
  name: string;
  kind: string;
};

const steps = [
  { id: 1, label: "Quelle" },
  { id: 2, label: "Ziel" },
  { id: 3, label: "Start" },
];

function uploadLocalFile(file: File, onProgress: (percent: number) => void) {
  return new Promise<FileEntry>((resolve, reject) => {
    const body = new FormData();
    body.set("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as { error?: string; entry?: FileEntry };
        if (xhr.status >= 200 && xhr.status < 300 && json.entry) {
          resolve(json.entry);
          return;
        }
        reject(new Error(json.error || "Upload fehlgeschlagen"));
      } catch {
        reject(new Error("Upload fehlgeschlagen"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload fehlgeschlagen"));
    xhr.send(body);
  });
}

export function TransferWizard() {
  const router = useRouter();
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [destId, setDestId] = useState<string | null>(null);
  const [file, setFile] = useState<FileEntry | null>(null);
  const [folder, setFolder] = useState<FileEntry | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState(1);

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
  const sourceName = connections.find((item) => item.id === sourceId)?.name;
  const destName = connections.find((item) => item.id === destId)?.name;

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

  const canLeaveSource = Boolean(sourceId && file);
  const canLeaveDest = Boolean(destId && folder);

  return (
    <div className="grid gap-6">
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((item) => (
          <li key={item.id}>
            <button
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                step === item.id ? "border-foreground bg-foreground text-background" : "text-muted-foreground",
              )}
              onClick={() => {
                if (item.id === 1) setStep(1);
                if (item.id === 2 && canLeaveSource) setStep(2);
                if (item.id === 3 && canLeaveSource && canLeaveDest) setStep(3);
              }}
              type="button"
            >
              <span className="font-medium tabular-nums">{item.id}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <FadeIn className="grid gap-3">
          <Label>Quelle</Label>
          <Select
            onValueChange={(value) => {
              setSourceId(value);
              setFile(null);
            }}
            value={sourceId ?? undefined}
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
            <FileUpload
              onFileRemove={() => setFile(null)}
              onUploadError={(error) => toast.error(error.message)}
              onUploadSuccess={() => toast.success("Datei liegt bereit")}
              upload={async (picked, onProgress) => {
                const entry = await uploadLocalFile(picked, onProgress);
                setFile(entry);
              }}
            />
          ) : (
            <FileBrowser
              connectionId={sourceId}
              mode="file"
              onSelect={(entry) => {
                if (!entry.isDir) setFile(entry);
              }}
              selectedId={file?.id}
            />
          )}
          {file ? (
            <p className="text-sm">
              Datei: <span className="font-medium">{file.name}</span>
            </p>
          ) : null}
          <Button disabled={!canLeaveSource} onClick={() => setStep(2)}>
            Weiter zum Ziel
          </Button>
        </FadeIn>
      ) : null}

      {step === 2 ? (
        <FadeIn className="grid gap-3">
          <Label>Ziel</Label>
          <Select
            onValueChange={(value) => {
              setDestId(value);
              setFolder(null);
            }}
            value={destId ?? undefined}
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
            onSelect={(entry) => {
              if (entry.isDir) setFolder(entry);
            }}
            selectedId={folder?.id}
          />
          {folder ? (
            <p className="text-sm">
              Ordner: <span className="font-medium">{folder.name}</span>
              {destKind === "share" ? " – danach gibt es einen iPhone-Link." : ""}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setStep(1)} variant="outline">
              Zurück
            </Button>
            <Button disabled={!canLeaveDest} onClick={() => setStep(3)}>
              Weiter zur Prüfung
            </Button>
          </div>
        </FadeIn>
      ) : null}

      {step === 3 ? (
        <FadeIn className="grid gap-4">
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Von</span> {sourceName}
            </p>
            <p className="mt-1 font-medium">{file?.name}</p>
            <p className="mt-3">
              <span className="text-muted-foreground">Nach</span> {destName}
            </p>
            <p className="mt-1 font-medium">{folder?.name}</p>
            {destKind === "share" ? (
              <p className="mt-3 text-muted-foreground">Danach erscheint in den Jobs ein iPhone-Link für 7 Tage.</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setStep(2)} variant="outline">
              Zurück
            </Button>
            <Button disabled={pending || !file || !folder} onClick={startTransfer} size="lg">
              {pending ? "Starten…" : "Datei übertragen"}
            </Button>
          </div>
        </FadeIn>
      ) : null}
    </div>
  );
}
