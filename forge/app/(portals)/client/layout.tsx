import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("client");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href="/client" className="text-lg font-semibold tracking-tight">
          Forge
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="font-medium">{user.full_name}</div>
            <div className="text-muted-foreground">Client</div>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
