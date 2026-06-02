"use client";

import { FormEvent, useState } from "react";
import { Navbar } from "@/components/navbar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const supabase = createSupabaseBrowserClient();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setMessage("Supabase env vars are missing. Configure .env.local to enable auth.");
      return;
    }
    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      setMessage(error?.message ?? "Account created. Check your email for confirmation.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.href = "/feed";
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-12">
        <section className="rounded-2xl border p-6">
          <h1 className="text-2xl font-semibold">{isSignup ? "Create account" : "Log in"}</h1>
          <p className="text-sm text-muted-foreground">Your ThinkFast data stays private to your account.</p>
          <form className="mt-6 space-y-3" onSubmit={submit}>
            {isSignup ? (
              <input
                className="w-full rounded-lg border p-2"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            ) : null}
            <input className="w-full rounded-lg border p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input
              className="w-full rounded-lg border p-2"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground">
              {isSignup ? "Sign up" : "Log in"}
            </button>
          </form>
          <button className="mt-3 text-sm text-primary" onClick={() => setIsSignup((v) => !v)}>
            {isSignup ? "Have an account? Log in" : "No account yet? Sign up"}
          </button>
          {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
        </section>
      </main>
    </div>
  );
}
