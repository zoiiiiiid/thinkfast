import Link from "next/link";

const links = [
  { href: "/feed", label: "Home", helper: "Personalized cards" },
  { href: "/create", label: "Create", helper: "Start from template" },
  { href: "/workspace", label: "Workspace", helper: "Chat with ThinkFast" },
  { href: "/boards", label: "Boards", helper: "Saved outputs" },
  { href: "/insights", label: "Insights", helper: "Usage patterns" },
];

export function Sidebar() {
  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-64 shrink-0 rounded-3xl border bg-card/70 p-3 shadow-sm backdrop-blur lg:block">
      <div className="mb-3 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
      </div>
      <nav className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group block rounded-2xl px-3 py-3 transition hover:bg-muted"
          >
            <p className="text-sm font-medium">{link.label}</p>
            <p className="text-xs text-muted-foreground">{link.helper}</p>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
