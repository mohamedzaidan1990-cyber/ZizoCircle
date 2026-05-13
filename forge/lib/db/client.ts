import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { Client, User } from "@/lib/types";

export async function getClientForCurrentUser(): Promise<Client | null> {
  const me = await requireRole("client");
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", me.id)
    .maybeSingle();
  return (data as Client | null) ?? null;
}

export async function getOwnerUser(): Promise<User | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("role", "owner")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return (data as User | null) ?? null;
}
