import Link from "next/link";
import type { ReactNode } from "react";

type FeedCardProps = {
  title: string;
  description: string;
  suggestedAction: string;
  href?: string | null;
  meta?: string | null;
};

function CardShell({ href, children }: { href?: string | null; children: ReactNode }) {
  if (!href) return <>{children}</>;

  return (
    <Link
      href={href}
      className="block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {children}
    </Link>
  );
}

export function FeedCard({
  title,
  description,
  suggestedAction,
  href,
  meta,
}: FeedCardProps) {
  return (
    <CardShell href={href}>
      <article className="group rounded-[1.5rem] border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <div className="mb-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {meta || "Suggested"}
        </div>
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <p className="mt-4 text-xs font-medium text-primary">
          {suggestedAction} {href ? "→" : ""}
        </p>
      </article>
    </CardShell>
  );
}

export function BoardCard({
  id,
  name,
  description,
  count,
}: {
  id?: string;
  name: string;
  description: string;
  count?: number;
}) {
  const content = (
    <article className="rounded-[1.5rem] border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:bg-muted/20">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold tracking-tight">{name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {description || "No description yet."}
          </p>
        </div>
        <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          {count ?? 0}
        </span>
      </div>
      <p className="mt-4 text-xs font-medium text-primary">Open board →</p>
    </article>
  );

  if (!id) return content;

  return (
    <Link
      href={`/boards/${id}`}
      className="block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {content}
    </Link>
  );
}

export function TemplateCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-[1.5rem] border bg-card p-4 shadow-sm transition hover:border-primary/30">
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}
