import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("client");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Client portal
          </p>
          <p className="text-sm font-medium">{profile.full_name ?? profile.email}</p>
        </div>
        <SignOutButton />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
