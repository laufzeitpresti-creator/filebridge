"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = { onCreated: () => void };

async function submit(body: Record<string, unknown>) {
  const response = await fetch("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(json.error || "Speichern fehlgeschlagen");
}

function useSubmit(onCreated: () => void) {
  const [pending, setPending] = useState(false);
  async function run(body: Record<string, unknown>, form?: HTMLFormElement) {
    setPending(true);
    try {
      await submit(body);
      toast.success("Verbindung gespeichert");
      form?.reset();
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler");
    } finally {
      setPending(false);
    }
  }
  return { pending, run };
}

export function SftpForm({ onCreated }: Props) {
  const { pending, run } = useSubmit(onCreated);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void run(
          {
            kind: "sftp",
            name: data.get("name"),
            host: data.get("host"),
            port: Number(data.get("port") || 22),
            username: data.get("username"),
            password: data.get("password") || undefined,
            privateKey: data.get("privateKey") || undefined,
          },
          event.currentTarget,
        );
      }}
    >
      <Field id="sftp-name" name="name" label="Anzeigename" required placeholder="Produktionsserver" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Field id="sftp-host" name="host" label="Host" required placeholder="sftp.example.de" />
        </div>
        <Field id="sftp-port" name="port" label="Port" type="number" defaultValue="22" />
      </div>
      <Field id="sftp-user" name="username" label="Benutzer" required autoComplete="off" />
      <Field id="sftp-pass" name="password" label="Passwort (optional, wenn Key)" type="password" autoComplete="new-password" />
      <div className="grid gap-1.5">
        <Label htmlFor="sftp-key">Privater Schlüssel</Label>
        <Textarea id="sftp-key" name="privateKey" rows={3} className="font-mono text-xs" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "SFTP anlegen"}
      </Button>
    </form>
  );
}

export function FtpForm({ onCreated }: Props) {
  const { pending, run } = useSubmit(onCreated);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void run(
          {
            kind: "ftp",
            name: data.get("name"),
            host: data.get("host"),
            port: Number(data.get("port") || 21),
            username: data.get("username"),
            password: data.get("password"),
            secure: data.get("secure") === "on",
          },
          event.currentTarget,
        );
      }}
    >
      <Field id="ftp-name" name="name" label="Anzeigename" required />
      <Field id="ftp-host" name="host" label="Host" required />
      <Field id="ftp-port" name="port" label="Port" type="number" defaultValue="21" />
      <Field id="ftp-user" name="username" label="Benutzer" required />
      <Field id="ftp-pass" name="password" label="Passwort" type="password" required />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="secure" />
        FTPS (TLS)
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "FTP anlegen"}
      </Button>
    </form>
  );
}

export function WebDavForm({ onCreated }: Props) {
  const { pending, run } = useSubmit(onCreated);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void run(
          {
            kind: "webdav",
            name: data.get("name"),
            url: data.get("url"),
            username: data.get("username"),
            password: data.get("password"),
          },
          event.currentTarget,
        );
      }}
    >
      <Field id="dav-name" name="name" label="Anzeigename" required placeholder="Nextcloud" />
      <Field id="dav-url" name="url" label="WebDAV-URL" required placeholder="https://cloud.example.de/remote.php/dav/files/user" />
      <Field id="dav-user" name="username" label="Benutzer" required />
      <Field id="dav-pass" name="password" label="Passwort" type="password" required />
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "WebDAV anlegen"}
      </Button>
    </form>
  );
}

export function S3Form({ onCreated }: Props) {
  const { pending, run } = useSubmit(onCreated);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void run(
          {
            kind: "s3",
            name: data.get("name"),
            endpoint: data.get("endpoint"),
            region: data.get("region") || "auto",
            bucket: data.get("bucket"),
            accessKeyId: data.get("accessKeyId"),
            secretAccessKey: data.get("secretAccessKey"),
          },
          event.currentTarget,
        );
      }}
    >
      <Field id="s3-name" name="name" label="Anzeigename" required placeholder="Backup-Bucket" />
      <Field id="s3-endpoint" name="endpoint" label="Endpoint" required placeholder="https://s3.eu-central-1.amazonaws.com" />
      <Field id="s3-region" name="region" label="Region" placeholder="eu-central-1" />
      <Field id="s3-bucket" name="bucket" label="Bucket" required />
      <Field id="s3-key" name="accessKeyId" label="Access Key" required autoComplete="off" />
      <Field id="s3-secret" name="secretAccessKey" label="Secret Key" type="password" required />
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "S3 anlegen"}
      </Button>
    </form>
  );
}

export function HttpForm({ onCreated }: Props) {
  const { pending, run } = useSubmit(onCreated);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void run(
          { kind: "http", name: data.get("name"), url: data.get("url") },
          event.currentTarget,
        );
      }}
    >
      <Field id="http-name" name="name" label="Anzeigename (optional)" placeholder="Rechnung vom Portal" />
      <Field id="http-url" name="url" label="https://…" required placeholder="https://example.de/datei.zip" />
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "URL merken"}
      </Button>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  ...props
}: ComponentProps<typeof Input> & { id: string; name: string; label: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...props} />
    </div>
  );
}
