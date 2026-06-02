import { WorkspaceClient } from "@/components/workspace-client";
import type { CreateTemplate } from "@/lib/types";
import { TEMPLATE_OPTIONS } from "@/lib/constants";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const params = await searchParams;
  const template = params.template;
  const initialTemplate = TEMPLATE_OPTIONS.includes(template as CreateTemplate) ? (template as CreateTemplate) : undefined;
  return <WorkspaceClient initialTemplate={initialTemplate} />;
}
