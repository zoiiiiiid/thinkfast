import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <AppShell>{children}</AppShell>;
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  return <AppShell>{children}</AppShell>;
}
