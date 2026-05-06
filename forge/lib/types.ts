export type UserRole = "owner" | "worker" | "client";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  created_at: string;
}
