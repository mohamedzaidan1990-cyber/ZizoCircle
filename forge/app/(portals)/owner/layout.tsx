import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { OwnerNav } from "@/components/owner/owner-nav";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("owner");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/owner" className="text-lg font-semibold tracking-tight">
            Forge
          </Link>
          <OwnerNav />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="font-medium">{user.full_name}</div>
            <div className="text-muted-foreground">Owner</div>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
