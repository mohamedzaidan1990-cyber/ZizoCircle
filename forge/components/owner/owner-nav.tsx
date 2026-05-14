"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/owner", label: "Dashboard", match: /^\/owner$/ },
  { href: "/owner/orders", label: "Orders", match: /^\/owner\/orders/ },
  { href: "/owner/clients", label: "Clients", match: /^\/owner\/clients/ },
  { href: "/owner/workers", label: "Workers", match: /^\/owner\/workers/ },
  { href: "/owner/inventory", label: "Inventory", match: /^\/owner\/(inventory|suppliers)/ },
  { href: "/owner/invoices", label: "Invoices", match: /^\/owner\/invoices/ },
];

export function OwnerNav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item) => {
        const active = item.match.test(path ?? "");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
