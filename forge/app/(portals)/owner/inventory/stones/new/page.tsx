import { requireRole } from "@/lib/auth";
import { listStoneSuppliers } from "@/lib/db/inventory";
import { StoneParcelForm } from "./stone-parcel-form";

export default async function NewStoneParcelPage() {
  await requireRole("owner");
  const suppliers = await listStoneSuppliers();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add stone parcel</h1>
        <p className="text-sm text-muted-foreground">
          Record a new stone parcel received from a supplier.
        </p>
      </div>
      <StoneParcelForm suppliers={suppliers} />
    </div>
  );
}
