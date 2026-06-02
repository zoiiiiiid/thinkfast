import Link from "next/link";
import { TemplateCard } from "@/components/cards";
import { TEMPLATE_OPTIONS } from "@/lib/constants";

export default function CreatePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Create a New Task</h1>
      <p className="text-sm text-muted-foreground">Choose a template to structure your request before generation.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TEMPLATE_OPTIONS.map((template) => (
          <Link key={template} href={`/workspace?template=${encodeURIComponent(template)}`}>
            <TemplateCard title={template} description={`Start a ${template.toLowerCase()} workflow with privacy and idea checks.`} />
          </Link>
        ))}
      </div>
    </section>
  );
}
