"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, ok, type ActionState } from "@/lib/actions";
import { notify, sendEmail } from "@/lib/notify";
import { formatQAR } from "@/lib/format";
import type { Invoice } from "@/lib/types";

async function loadInvoice(id: string): Promise<Invoice | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Invoice | null) ?? null;
}

async function getClientContact(clientId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("user_id, email, full_name")
    .eq("id", clientId)
    .maybeSingle();
  return (data as {
    user_id: string | null;
    email: string | null;
    full_name: string;
  } | null) ?? null;
}

export async function sendInvoiceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const id = String(formData.get("invoice_id") ?? "");
  if (!id) return failure("Missing invoice.");

  const inv = await loadInvoice(id);
  if (!inv) return failure("Invoice not found.");
  if (inv.status !== "draft") return failure("Only draft invoices can be sent.");

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: nowIso })
    .eq("id", id)
    .eq("status", "draft");
  if (error) return failure(error.message);

  const contact = await getClientContact(inv.client_id);
  if (contact) {
    const cta = {
      label: "View invoice",
      href: `/client/invoices/${inv.id}`,
    };
    const body = `Your invoice ${inv.invoice_number} for ${formatQAR(
      inv.total_qar
    )} is ready to view.`;
    if (contact.user_id) {
      await notify({
        userIds: [contact.user_id],
        type: "invoice_sent",
        title: `Invoice ${inv.invoice_number} from your workshop`,
        body,
        orderId: inv.order_id,
        cta,
        data: { invoice_id: inv.id },
      });
    } else if (contact.email) {
      await sendEmail({
        to: contact.email,
        recipientName: contact.full_name,
        subject: `Invoice ${inv.invoice_number} from your workshop`,
        body,
      });
    }
  }

  revalidatePath("/owner/invoices");
  revalidatePath(`/owner/invoices/${id}`);
  return ok("Invoice sent.");
}

export async function recordDepositAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const me = await requireRole("owner");
  const supabase = createClient();

  const id = String(formData.get("invoice_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!id) return failure("Missing invoice.");

  const inv = await loadInvoice(id);
  if (!inv) return failure("Invoice not found.");
  if (inv.status === "draft") return failure("Send the invoice first.");
  if (inv.status === "cancelled") return failure("Invoice is cancelled.");
  if (inv.deposit_paid_at) return failure("Deposit already recorded.");
  if (inv.deposit_amount_qar <= 0) return failure("This invoice has no deposit.");

  const nowIso = new Date().toISOString();
  const balanceZero = Number(inv.balance_due_qar) <= 0;
  const newStatus = balanceZero ? "paid" : "partially_paid";

  const update: Record<string, unknown> = {
    deposit_paid_at: nowIso,
    status: newStatus,
  };
  if (balanceZero) update.balance_paid_at = nowIso;

  const { error: invErr } = await supabase
    .from("invoices")
    .update(update)
    .eq("id", id);
  if (invErr) return failure(invErr.message);

  const { error: ledgerErr } = await supabase.from("accounting_ledger").insert({
    txn_date: nowIso.slice(0, 10),
    txn_type: "deposit_received",
    description: `Deposit received for ${inv.invoice_number}`,
    amount_qar: inv.deposit_amount_qar,
    is_credit: true,
    reference_id: inv.id,
    reference_type: "invoice",
    notes,
    created_by: me.id,
  });
  if (ledgerErr) return failure(`Saved invoice but ledger failed: ${ledgerErr.message}`);

  await bumpClientSpent(inv.client_id, Number(inv.deposit_amount_qar));

  const contact = await getClientContact(inv.client_id);
  if (contact?.user_id) {
    await notify({
      userIds: [contact.user_id],
      type: "payment_received",
      title: "Deposit received",
      body: `We've recorded your deposit of ${formatQAR(
        inv.deposit_amount_qar
      )} on ${inv.invoice_number}. Thank you.`,
      orderId: inv.order_id,
      cta: { label: "View invoice", href: `/client/invoices/${inv.id}` },
    });
  }

  revalidatePath("/owner/invoices");
  revalidatePath(`/owner/invoices/${id}`);
  return ok("Deposit recorded.");
}

export async function recordBalanceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const me = await requireRole("owner");
  const supabase = createClient();

  const id = String(formData.get("invoice_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!id) return failure("Missing invoice.");

  const inv = await loadInvoice(id);
  if (!inv) return failure("Invoice not found.");
  if (inv.status === "draft") return failure("Send the invoice first.");
  if (inv.status === "cancelled") return failure("Invoice is cancelled.");
  if (inv.status === "paid" || inv.balance_paid_at) {
    return failure("Balance already paid.");
  }
  if (inv.deposit_amount_qar > 0 && !inv.deposit_paid_at) {
    return failure("Record the deposit before the balance.");
  }

  const nowIso = new Date().toISOString();
  const { error: invErr } = await supabase
    .from("invoices")
    .update({ balance_paid_at: nowIso, status: "paid" })
    .eq("id", id);
  if (invErr) return failure(invErr.message);

  const { error: ledgerErr } = await supabase.from("accounting_ledger").insert({
    txn_date: nowIso.slice(0, 10),
    txn_type: "invoice_payment",
    description: `Balance received for ${inv.invoice_number}`,
    amount_qar: inv.balance_due_qar,
    is_credit: true,
    reference_id: inv.id,
    reference_type: "invoice",
    notes,
    created_by: me.id,
  });
  if (ledgerErr) return failure(`Saved invoice but ledger failed: ${ledgerErr.message}`);

  await bumpClientSpent(inv.client_id, Number(inv.balance_due_qar));

  const contact = await getClientContact(inv.client_id);
  if (contact?.user_id) {
    await notify({
      userIds: [contact.user_id],
      type: "payment_received",
      title: "Payment received — invoice settled",
      body: `Final payment of ${formatQAR(inv.balance_due_qar)} received on ${
        inv.invoice_number
      }. Thank you for your business.`,
      orderId: inv.order_id,
      cta: { label: "View invoice", href: `/client/invoices/${inv.id}` },
    });
  }

  revalidatePath("/owner/invoices");
  revalidatePath(`/owner/invoices/${id}`);
  return ok("Balance recorded.");
}

export async function cancelInvoiceAction(formData: FormData) {
  await requireRole("owner");
  const supabase = createClient();
  const id = String(formData.get("invoice_id") ?? "");
  if (!id) redirect("/owner/invoices");

  const inv = await loadInvoice(id);
  if (!inv) redirect("/owner/invoices");
  if (inv.deposit_paid_at || inv.balance_paid_at) {
    redirect(`/owner/invoices/${id}?error=already-paid`);
  }

  await supabase.from("invoices").update({ status: "cancelled" }).eq("id", id);

  revalidatePath("/owner/invoices");
  revalidatePath(`/owner/invoices/${id}`);
  redirect(`/owner/invoices/${id}`);
}

async function bumpClientSpent(clientId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("total_spent_qar")
    .eq("id", clientId)
    .maybeSingle();
  const current = Number(
    (data as { total_spent_qar: number } | null)?.total_spent_qar ?? 0
  );
  await supabase
    .from("clients")
    .update({ total_spent_qar: current + amount })
    .eq("id", clientId);
}
