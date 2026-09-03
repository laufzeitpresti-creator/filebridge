import type { ReactNode } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/app", label: "Übersicht" },
  { href: "/app/connections", label: "Verbindungen" },
  { href: "/app/transfers", label: "Jobs" },
  { href: "/app/transfers/new", label: "Übertragen" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  await auth.protect();
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/app" className="text-sm font-semibold">
            FileBridge
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <UserButton />
        </div>
      </header>
      <SetupBanner />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
    </div>
  );
}
