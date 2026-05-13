import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "./profile-form";
import type { User, WorkerProfile } from "@/lib/types";

export default async function WorkerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("owner");
  const supabase = createClient();

  const { data: workerData } = await supabase
    .from("users")
    .select("*")
    .eq("id", params.id)
    .eq("role", "worker")
    .maybeSingle();

  if (!workerData) notFound();
  const worker = workerData as User;

  const { data: profileData } = await supabase
    .from("worker_profiles")
    .select("*")
    .eq("user_id", worker.id)
    .maybeSingle();

  const profile = (profileData ?? null) as WorkerProfile | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{worker.full_name}</h1>
          <p className="text-sm text-muted-foreground">{worker.email ?? "No email"}</p>
        </div>
        <Link
          href="/owner/workers"
          className={buttonVariants({ variant: "outline" })}
        >
          Back to workers
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Worker account</CardTitle>
          <CardDescription>
            Read-only — these come from the user row. Change via Supabase admin if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            {worker.is_active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="muted">Inactive</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Portal:</span>
            {worker.supabase_auth_id ? (
              <Badge variant="success">Linked</Badge>
            ) : (
              <Badge variant="warning">Awaiting signup</Badge>
            )}
          </div>
          {worker.phone && (
            <div>
              <span className="text-muted-foreground">Phone: </span>
              {worker.phone}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>
            Specialisations, gold-loss tolerance, working hours, hire date,
            hourly rate, and notes. Tolerance feeds the gold-loss flag trigger
            on every stage this worker submits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm workerId={worker.id} profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
