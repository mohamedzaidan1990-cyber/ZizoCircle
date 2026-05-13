import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { STORAGE } from "@/lib/storage";
import { formatCarats, formatDateTime, formatQAR } from "@/lib/format";
import { IssueStonesForm } from "./issue-form";
import type { Order, OrderGemstone, User } from "@/lib/types";

export default async function StonesPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!orderRow) notFound();
  const o = orderRow as Order;

  const [{ data: gems }, { data: workers }] = await Promise.all([
    supabase
      .from("order_gemstones")
      .select("*")
      .eq("order_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "worker")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
  ]);

  const gemRows = (gems ?? []) as OrderGemstone[];
  const workerOptions = (workers ?? []) as Pick<User, "id" | "full_name">[];

  const issuePaths = gemRows.map((g) => g.issue_photo_url).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          <Link href="/owner/orders" className="hover:underline">
            Orders
          </Link>{" "}
          /{" "}
          <Link href={`/owner/orders/${o.id}`} className="hover:underline">
            {o.order_number}
          </Link>{" "}
          / Gemstones
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Issue gemstones</h1>
        <p className="text-sm text-muted-foreground">
          Record every stone batch with quality grades and a handover photo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Issued ({gemRows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {gemRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">None issued yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {gemRows.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm">
                  <div>
                    <div className="font-medium capitalize">
                      {g.qty_pieces}× {g.stone_type}
                      {g.stone_shape ? ` · ${g.stone_shape.replace("_", " ")}` : ""}
                    </div>
                    <div className="text-muted-foreground">
                      {formatCarats(g.total_carats)}
                      {g.colour_grade ? ` · ${g.colour_grade}` : ""}
                      {g.clarity_grade ? ` · ${g.clarity_grade}` : ""}
                      {g.cert_lab ? ` · ${g.cert_lab} ${g.cert_number ?? ""}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant={g.source === "client_supplied" ? "warning" : "default"}>
                      {g.source === "client_supplied" ? "Client" : "Factory"}
                    </Badge>
                    {g.estimated_value_qar != null && (
                      <span className="text-muted-foreground">
                        {formatQAR(g.estimated_value_qar)}
                      </span>
                    )}
                    {g.issued_at && (
                      <span className="text-muted-foreground">
                        Issued {formatDateTime(g.issued_at)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {issuePaths.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase text-muted-foreground">Handover photos</p>
              <PhotoGrid bucket={STORAGE.issuePhotos} paths={issuePaths} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New issuance</CardTitle>
        </CardHeader>
        <CardContent>
          <IssueStonesForm orderId={o.id} workers={workerOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
