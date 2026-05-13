import { requireRole } from "@/lib/auth";
import { listGoldSuppliers } from "@/lib/db/inventory";
import { GoldPurchaseForm } from "./gold-purchase-form";

export default async function NewGoldPurchasePage() {
  await requireRole("owner");
  const suppliers = await listGoldSuppliers();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add gold purchase</h1>
        <p className="text-sm text-muted-foreground">
          Record a new gold lot received from a supplier.
        </p>
      </div>
      <GoldPurchaseForm suppliers={suppliers} />
    </div>
  );
}
