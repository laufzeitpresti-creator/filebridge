"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

export function MorphicNavbar({
  items,
  className,
}: {
  items: NavItem[];
  className?: string;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <nav aria-label="Hauptnavigation" className={cn("min-w-0 flex-1", className)}>
      <div className="flex overflow-x-auto rounded-xl border bg-muted/40 p-1">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-all duration-300",
                active
                  ? "bg-foreground font-medium text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MorphicNavbar;
