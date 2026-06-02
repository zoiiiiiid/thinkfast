"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/feed", label: "Home" },
  { href: "/workspace", label: "Workspace" },
  { href: "/boards", label: "Boards" },
  { href: "/insights", label: "Insights" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-52 shrink-0 lg:block">
      <div className="rounded-[1.5rem] border bg-card p-2 shadow-sm">
        <div className="px-3 py-3">
          <p className="text-sm font-semibold tracking-tight">ThinkFast</p>
          <p className="text-xs text-muted-foreground">Idea-led AI</p>
        </div>
        <nav className="space-y-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-2xl px-3 py-2.5 text-sm transition ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
