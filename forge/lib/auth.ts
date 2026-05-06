import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

export async function requireRole(role: UserRole): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(`/${profile.role}`);
  return profile;
}
