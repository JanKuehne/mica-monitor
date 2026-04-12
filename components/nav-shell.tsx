"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Building2, Sparkles, Sun, Moon, LayoutDashboard } from "lucide-react";

const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/", label: "Companies", icon: Building2 },
  { href: "/new-entries", label: "New Entries", icon: Sparkles },
];

export default function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-muted/30 flex flex-col h-screen sticky top-0 shrink-0">
        {/* Logo */}
        <div className="p-4 border-b">
          <span className="text-xl font-bold tracking-tight">MiCA</span>
          <p className="text-xs text-muted-foreground mt-0.5">Entity Tracker</p>
        </div>

        {/* Dark mode toggle */}
        <div className="px-3 py-2 border-b">
          <button
            onClick={() => setDark(!dark)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Imprint */}
        <div className="px-3 py-3 border-t">
          <Link
            href="/imprint"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Imprint
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
