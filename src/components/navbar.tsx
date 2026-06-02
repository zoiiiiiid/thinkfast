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
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/feed" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground">TF</span>
          <span className="text-base font-semibold tracking-tight">ThinkFast</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/workspace" className="rounded-full px-3 py-2 text-sm hover:bg-muted">
            Workspace
          </Link>
          <Link href="/boards" className="rounded-full px-3 py-2 text-sm hover:bg-muted">
            Boards
          </Link>
          <Link href="/feed" className="rounded-full px-3 py-2 text-sm hover:bg-muted">
            Feed
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {email ? <span className="hidden max-w-40 truncate text-xs text-muted-foreground sm:inline">{email}</span> : null}
          {email ? (
            <button className="rounded-full bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={logout}>
              Log out
            </button>
          ) : (
            <Link href="/auth" className="rounded-full bg-primary px-3 py-2 text-sm text-primary-foreground">
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
