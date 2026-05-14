import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/types";

export default async function WorkersPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("role", "worker")
    .order("full_name", { ascending: true });
  const workers = (data ?? []) as User[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workers</h1>
          <p className="text-sm text-muted-foreground">
            Pre-create a worker by email — they get portal access when they sign up.
          </p>
        </div>
        <Link href="/owner/workers/new" className={buttonVariants()}>
          Add worker
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {workers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No workers yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Portal</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/owner/workers/${w.id}`}
                        className="hover:underline"
                      >
                        {w.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{w.email ?? "—"}</td>
                    <td className="px-4 py-3">{w.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      {w.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="muted">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {w.supabase_auth_id ? (
                        <Badge variant="success">Linked</Badge>
                      ) : (
                        <Badge variant="warning">Awaiting signup</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/owner/workers/${w.id}`}
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Edit profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
