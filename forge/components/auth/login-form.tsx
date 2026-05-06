"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "sign-in" | "sign-up";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/";
  const initialError = search.get("error");

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "no-role"
      ? "Your account has no role assigned yet. Contact the owner."
      : null
  );
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
          });

    setPending(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === "sign-up" && !result.data.session) {
      setInfo("Check your email to confirm your account.");
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {info && <p className="text-sm text-muted-foreground">{info}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </Button>

      <button
        type="button"
        className="w-full text-xs text-muted-foreground hover:underline"
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
          setInfo(null);
        }}
      >
        {mode === "sign-in"
          ? "No account? Create one"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
