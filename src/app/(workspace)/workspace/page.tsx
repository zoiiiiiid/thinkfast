import { WorkspaceClient } from "@/components/workspace-client";
import { MODE_OPTIONS, TEMPLATE_OPTIONS } from "@/lib/constants";
import type { AiMode, CreateTemplate } from "@/lib/types";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; conversationId?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const template = params.template;
  const mode = params.mode;

  const initialTemplate = TEMPLATE_OPTIONS.includes(template as CreateTemplate)
    ? (template as CreateTemplate)
    : undefined;

  const initialMode = MODE_OPTIONS.some((item) => item.value === mode)
    ? (mode as AiMode)
    : undefined;

  return (
    <WorkspaceClient
      initialTemplate={initialTemplate}
      initialConversationId={params.conversationId}
      initialMode={initialMode}
    />
  );
}
