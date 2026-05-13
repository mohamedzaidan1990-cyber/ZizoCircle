import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "./styles";
import { formatDate, formatDateTime, formatQAR } from "@/lib/format";
import type {
  Client,
  Invoice,
  InvoiceLineItem,
  Order,
  User,
} from "@/lib/types";

export interface InvoicePDFProps {
  invoice: Invoice;
  order: Pick<Order, "order_number" | "piece_type" | "karat"> | null;
  client: Pick<Client, "full_name" | "company_name" | "email" | "phone" | "address"> | null;
  workshop: Pick<User, "full_name" | "email" | "phone"> | null;
}

export function InvoicePDF({ invoice, order, client, workshop }: InvoicePDFProps) {
  const lineItems = (Array.isArray(invoice.line_items)
    ? (invoice.line_items as InvoiceLineItem[])
    : []) as InvoiceLineItem[];

  return (
    <Document
      title={`Invoice ${invoice.invoice_number}`}
      author={workshop?.full_name ?? "Forge"}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Forge</Text>
            <Text style={styles.brandSub}>Jewelry workshop</Text>
            {workshop?.full_name && (
              <Text style={[styles.brandSub, { marginTop: 6 }]}>
                {workshop.full_name}
                {workshop.email ? `  ·  ${workshop.email}` : ""}
                {workshop.phone ? `  ·  ${workshop.phone}` : ""}
              </Text>
            )}
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.docTitle}>Invoice</Text>
            <Text style={styles.docNumber}>{invoice.invoice_number}</Text>
            <Text style={[styles.brandSub, { marginTop: 6 }]}>
              Issued {formatDate(invoice.sent_at ?? invoice.created_at)}
            </Text>
            {invoice.due_date && (
              <Text style={styles.brandSub}>Due {formatDate(invoice.due_date)}</Text>
            )}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Bill to</Text>
            <Text style={[styles.body, styles.bold]}>{client?.full_name ?? "—"}</Text>
            {client?.company_name && (
              <Text style={styles.body}>{client.company_name}</Text>
            )}
            {client?.address && <Text style={styles.body}>{client.address}</Text>}
            {client?.email && <Text style={styles.body}>{client.email}</Text>}
            {client?.phone && <Text style={styles.body}>{client.phone}</Text>}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Order</Text>
            {order ? (
              <>
                <Text style={[styles.body, styles.bold]}>{order.order_number}</Text>
                <Text style={styles.body}>
                  {order.piece_type} · {order.karat}
                </Text>
              </>
            ) : (
              <Text style={styles.body}>—</Text>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 4 }]}>Description</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Qty</Text>
            <Text style={[styles.th, { flex: 2, textAlign: "right" }]}>Unit price</Text>
            <Text style={[styles.th, { flex: 2, textAlign: "right" }]}>Amount</Text>
          </View>
          {lineItems.length === 0 ? (
            <Text style={[styles.td, { color: colors.muted, padding: 6 }]}>
              No line items.
            </Text>
          ) : (
            lineItems.map((li, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.td, { flex: 4 }]}>{li.label}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{li.qty}</Text>
                <Text style={[styles.td, { flex: 2, textAlign: "right" }]}>
                  {formatQAR(li.unit_price)}
                </Text>
                <Text style={[styles.td, { flex: 2, textAlign: "right" }]}>
                  {formatQAR(li.total)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{formatQAR(invoice.subtotal_qar)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Tax ({Number(invoice.tax_pct).toFixed(2)}%)</Text>
            <Text>{formatQAR(invoice.tax_amount_qar)}</Text>
          </View>
          <View style={styles.totalsRowEmphasis}>
            <Text style={styles.bold}>Total</Text>
            <Text style={styles.bold}>{formatQAR(invoice.total_qar)}</Text>
          </View>
          {invoice.deposit_amount_qar > 0 && (
            <View style={styles.totalsRow}>
              <Text>
                Deposit ({Number(invoice.deposit_pct).toFixed(0)}%)
                {invoice.deposit_paid_at ? "  ·  paid" : ""}
              </Text>
              <Text>{formatQAR(invoice.deposit_amount_qar)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text>Balance due{invoice.balance_paid_at ? "  ·  paid" : ""}</Text>
            <Text style={styles.bold}>{formatQAR(invoice.balance_due_qar)}</Text>
          </View>
        </View>

        {invoice.deposit_paid_at && (
          <Text style={[styles.body, { marginTop: 16, color: colors.muted }]}>
            Deposit received {formatDateTime(invoice.deposit_paid_at)}.
          </Text>
        )}
        {invoice.balance_paid_at && (
          <Text style={[styles.body, { color: colors.muted }]}>
            Final payment received {formatDateTime(invoice.balance_paid_at)}.
          </Text>
        )}

        {invoice.notes && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.body}>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          Forge · {invoice.invoice_number} · Generated{" "}
          {formatDateTime(new Date().toISOString())}
        </Text>
      </Page>
    </Document>
  );
}
