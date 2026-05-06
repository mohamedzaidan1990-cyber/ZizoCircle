import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User, UserRole } from "@/lib/types";

const USER_COLUMNS =
  "id, supabase_auth_id, full_name, phone, email, role, language_pref, avatar_url, is_active, last_login_at, created_at, updated_at";

export async function getAuthUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data } = await supabase
    .from("users")
    .select(USER_COLUMNS)
    .eq("supabase_auth_id", authUser.id)
    .maybeSingle();

  return (data as User | null) ?? null;
}

export async function requireRole(role: UserRole): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.is_active) redirect("/login?error=inactive");
  if (user.role !== role) redirect(`/${user.role}`);
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
