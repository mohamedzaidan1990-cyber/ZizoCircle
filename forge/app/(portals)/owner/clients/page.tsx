import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatQAR } from "@/lib/format";
import type { Client } from "@/lib/types";

export default async function ClientsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("full_name", { ascending: true });
  const clients = (data ?? []) as Client[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Customers who place orders. Linked to portal logins by email.
          </p>
        </div>
        <Link href="/owner/clients/new" className={buttonVariants()}>
          New client
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No clients yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Spent</th>
                  <th className="px-4 py-3">Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.full_name}</td>
                    <td className="px-4 py-3">{c.company_name ?? "—"}</td>
                    <td className="px-4 py-3">{c.email ?? "—"}</td>
                    <td className="px-4 py-3">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3">{c.total_orders}</td>
                    <td className="px-4 py-3">{formatQAR(c.total_spent_qar)}</td>
                    <td className="px-4 py-3">
                      {c.user_id ? (
                        <Badge variant="success">Linked</Badge>
                      ) : (
                        <Badge variant="muted">Not linked</Badge>
                      )}
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
