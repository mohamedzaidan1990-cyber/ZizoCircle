import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderForm } from "./order-form";
import type { Client, StageTemplate, User } from "@/lib/types";

export default async function NewOrderPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: workers }, { data: templates }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name, company_name")
      .order("full_name", { ascending: true }),
    supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "worker")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("stage_templates")
      .select("id, name, is_default")
      .order("is_default", { ascending: false }),
  ]);

  const clientList =
    (clients ?? []) as Pick<Client, "id" | "full_name" | "company_name">[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New order</h1>
        <p className="text-sm text-muted-foreground">
          Pick a client, define the piece, optionally assign a worker and stage template.
        </p>
      </div>

      {clientList.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm">
            <p>No clients yet.</p>
            <Link href="/owner/clients/new" className="text-primary underline">
              Create a client first
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order details</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderForm
              clients={clientList}
              workers={(workers ?? []) as Pick<User, "id" | "full_name">[]}
              templates={
                (templates ?? []) as Pick<StageTemplate, "id" | "name" | "is_default">[]
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
