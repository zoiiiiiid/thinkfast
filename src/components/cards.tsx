import Link from "next/link";

type FeedCardProps = {
  title: string;
  description: string;
  suggestedAction: string;
};

export function FeedCard({ title, description, suggestedAction }: FeedCardProps) {
  return (
    <article className="group rounded-3xl border bg-card/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        Suggested
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <p className="mt-4 text-xs font-semibold text-primary">{suggestedAction}</p>
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
    <article className="group relative overflow-hidden rounded-3xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/10" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Board
          </div>
          <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {description || "No description yet."}
          </p>
        </div>
        <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          {count ?? 0} saved
        </span>
      </div>
      <p className="relative mt-5 text-xs font-semibold text-primary opacity-80 transition group-hover:opacity-100">
        Open board →
      </p>
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
    <article className="group rounded-3xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-muted text-sm font-semibold">
        {title.slice(0, 1)}
      </div>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}
