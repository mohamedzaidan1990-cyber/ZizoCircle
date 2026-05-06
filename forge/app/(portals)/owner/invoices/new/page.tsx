import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceForm } from "./invoice-form";
import type { Client, Order } from "@/lib/types";

export default async function NewInvoicePage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, piece_type, karat, clients(full_name)")
    .order("created_at", { ascending: false });

  const orders =
    (data ?? []) as (Pick<Order, "id" | "order_number" | "piece_type" | "karat"> & {
      clients: Pick<Client, "full_name"> | null;
    })[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New invoice</h1>
        <p className="text-sm text-muted-foreground">
          Build line items, set a deposit, and save as draft. Sending + payment recording is next.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice details</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders to invoice yet.</p>
          ) : (
            <InvoiceForm orders={orders} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
