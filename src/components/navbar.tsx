"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function Navbar() {
  const [email, setEmail] = useState("");
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, [supabase]);

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/workspace" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">TF</span>
          <span className="text-sm font-semibold tracking-tight">ThinkFast</span>
        </Link>

        <nav className="flex items-center gap-1 md:hidden">
          <Link href="/workspace" className="rounded-full px-2.5 py-1.5 text-xs hover:bg-muted">Workspace</Link>
          <Link href="/boards" className="rounded-full px-2.5 py-1.5 text-xs hover:bg-muted">Boards</Link>
        </nav>

        <div className="flex items-center gap-2">
          {email ? <span className="hidden max-w-44 truncate text-xs text-muted-foreground sm:inline">{email}</span> : null}
          {email ? (
            <button className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted" onClick={logout}>
              Log out
            </button>
          ) : (
            <Link href="/auth" className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
