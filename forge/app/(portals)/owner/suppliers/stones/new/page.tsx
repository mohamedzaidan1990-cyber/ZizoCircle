import { requireRole } from "@/lib/auth";
import { StoneSupplierForm } from "./supplier-form";

export default async function NewStoneSupplierPage() {
  await requireRole("owner");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add stone supplier</h1>
        <p className="text-sm text-muted-foreground">
          Register a new stone supplier. Only the name is required.
        </p>
      </div>
      <StoneSupplierForm />
    </div>
  );
}
