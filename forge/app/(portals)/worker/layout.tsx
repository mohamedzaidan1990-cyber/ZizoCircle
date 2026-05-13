import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("worker");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href="/worker" className="text-lg font-semibold tracking-tight">
          Sougha Concepts — Workshop
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="font-medium">{user.full_name}</div>
            <div className="text-muted-foreground">Worker</div>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
