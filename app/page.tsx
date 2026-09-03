import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRightIcon, FolderSyncIcon, LockKeyholeIcon, ShieldCheckIcon } from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link className="text-sm font-semibold tracking-tight" href="/">
            FileBridge
          </Link>
          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <Button variant="ghost">Anmelden</Button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <Button>Kostenlos starten</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button asChild>
                <Link href="/app">Zum Dashboard</Link>
              </Button>
            </Show>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12 md:py-20">
        <FadeIn>
          <p className="text-sm font-medium text-muted-foreground">Open Source · MIT-Lizenz</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Dateien zwischen Cloud, Server und iPhone. Jedes Format.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            OneDrive, Google Drive, Dropbox, Box, SFTP, FTP, WebDAV, S3, Browser-Upload und
            Download-Links. Die Datei bleibt, wie sie ist.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Show when="signed-out">
              <SignUpButton mode="redirect">
                <Button size="lg">
                  Jetzt übertragen
                  <ArrowRightIcon />
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button asChild size="lg">
                <Link href="/app/transfers/new">
                  Datei übertragen
                  <ArrowRightIcon />
                </Link>
              </Button>
            </Show>
          </div>
        </FadeIn>

        <FadeIn className="mt-12 grid gap-3 sm:grid-cols-3" delay={0.08}>
          {[
            { step: "1", title: "Verbinden", text: "Cloud, Server oder dieses Gerät. Einmal, dann fertig." },
            { step: "2", title: "Datei wählen", text: "PDF, Video, ZIP, CAD – ohne Konvertierung." },
            { step: "3", title: "Ziel setzen", text: "Ordner oder iPhone-Link. Fortschritt live in den Jobs." },
          ].map((item) => (
            <div className="rounded-xl border bg-card px-4 py-4" key={item.step}>
              <p className="text-xs font-medium text-muted-foreground">Schritt {item.step}</p>
              <h2 className="mt-1 font-medium">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </FadeIn>

        <FadeIn delay={0.14}>
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            <li className="rounded-xl border bg-card p-5">
              <FolderSyncIcon className="size-5" />
              <h2 className="mt-3 font-medium">Direkt streamen</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                PDF, Video, ZIP, CAD – die Datei bleibt, wie sie ist. Keine Konvertierung.
              </p>
            </li>
            <li className="rounded-xl border bg-card p-5">
              <LockKeyholeIcon className="size-5" />
              <h2 className="mt-3 font-medium">Zugänge verschlüsselt</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Refresh-Tokens und SFTP-Keys liegen AES-GCM-verschlüsselt in Postgres.
              </p>
            </li>
            <li className="rounded-xl border bg-card p-5">
              <ShieldCheckIcon className="size-5" />
              <h2 className="mt-3 font-medium">Wartbar und patchbar</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Wenige Abhängigkeiten, Dependabot, CI-Audit. Ein Connector ist eine Datei.
              </p>
            </li>
          </ul>
        </FadeIn>
      </main>
    </div>
  );
}
