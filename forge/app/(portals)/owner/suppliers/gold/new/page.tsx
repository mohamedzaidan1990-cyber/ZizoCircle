import { requireRole } from "@/lib/auth";
import { GoldSupplierForm } from "./supplier-form";

export default async function NewGoldSupplierPage() {
  await requireRole("owner");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add gold supplier</h1>
        <p className="text-sm text-muted-foreground">
          Register a new gold supplier. Only the name is required.
        </p>
      </div>
      <GoldSupplierForm />
    </div>
  );
}
