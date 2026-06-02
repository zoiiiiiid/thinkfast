import Link from "next/link";

type FeedCardProps = {
  title: string;
  description: string;
  suggestedAction: string;
};

export function FeedCard({ title, description, suggestedAction }: FeedCardProps) {
  return (
    <article className="rounded-[1.5rem] border bg-card p-4 shadow-sm transition hover:border-primary/30">
      <div className="mb-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        Suggested
      </div>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <p className="mt-4 text-xs font-medium text-primary">{suggestedAction}</p>
    </article>
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
        <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{count ?? 0}</span>
      </div>
      <p className="mt-4 text-xs font-medium text-primary">Open board →</p>
    </article>
  );

  if (!id) return content;

  return (
    <Link href={`/boards/${id}`} className="block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
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
