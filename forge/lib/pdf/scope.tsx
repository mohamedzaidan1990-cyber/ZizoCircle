import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "./styles";
import { formatDate, formatDateTime, formatQAR } from "@/lib/format";
import type { Client, Order, ScopeItem, User } from "@/lib/types";

export interface ScopePDFProps {
  order: Pick<
    Order,
    | "order_number"
    | "piece_type"
    | "piece_description"
    | "karat"
    | "target_weight_grams"
    | "estimated_delivery"
    | "scope_signed_at"
    | "scope_client_ip"
  >;
  items: ScopeItem[];
  client: Pick<Client, "full_name" | "company_name" | "email" | "phone" | "address"> | null;
  workshop: Pick<User, "full_name" | "email" | "phone"> | null;
}

export function ScopePDF({ order, items, client, workshop }: ScopePDFProps) {
  const signed = !!order.scope_signed_at;

  return (
    <Document
      title={`Scope of Work — ${order.order_number}`}
      author={workshop?.full_name ?? "Forge"}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
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
            <Text style={styles.docTitle}>Scope of Work</Text>
            <Text style={styles.docNumber}>{order.order_number}</Text>
            {order.estimated_delivery && (
              <Text style={[styles.brandSub, { marginTop: 6 }]}>
                Est. delivery {formatDate(order.estimated_delivery)}
              </Text>
            )}
          </View>
        </View>

        {/* Two columns: client + piece */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Client</Text>
            <Text style={[styles.body, styles.bold]}>{client?.full_name ?? "—"}</Text>
            {client?.company_name && (
              <Text style={styles.body}>{client.company_name}</Text>
            )}
            {client?.address && <Text style={styles.body}>{client.address}</Text>}
            {client?.email && <Text style={styles.body}>{client.email}</Text>}
            {client?.phone && <Text style={styles.body}>{client.phone}</Text>}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Piece</Text>
            <Text style={[styles.body, styles.bold]}>
              {order.piece_type} · {order.karat}
            </Text>
            {order.target_weight_grams != null && (
              <Text style={styles.body}>
                Target weight: {order.target_weight_grams} g
              </Text>
            )}
            {order.piece_description && (
              <Text style={[styles.body, { marginTop: 4 }]}>
                {order.piece_description}
              </Text>
            )}
          </View>
        </View>

        {/* Scope items */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Scope items</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>Category</Text>
            <Text style={[styles.th, { flex: 3 }]}>Item</Text>
            <Text style={[styles.th, { flex: 4 }]}>Detail</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Ack</Text>
          </View>
          {items.length === 0 ? (
            <Text style={[styles.td, { color: colors.muted, padding: 6 }]}>
              No scope items.
            </Text>
          ) : (
            items.map((it, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.td, { flex: 1, color: colors.muted }]}>
                  {it.category}
                </Text>
                <Text style={[styles.td, styles.bold, { flex: 3 }]}>{it.label}</Text>
                <Text style={[styles.td, { flex: 4, color: colors.muted }]}>
                  {it.detail}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { flex: 1, textAlign: "right" },
                    it.client_ack ? { color: "#16a34a" } : { color: colors.muted },
                  ]}
                >
                  {it.client_ack ? "✓" : "—"}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Signature block */}
        <View style={[styles.signatureBox, { marginTop: 32 }]}>
          {signed ? (
            <>
              <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
                Client signature
              </Text>
              <Text style={styles.body}>
                Signed by{" "}
                <Text style={styles.bold}>{client?.full_name ?? "client"}</Text>
                {" on "}
                {formatDateTime(order.scope_signed_at)}
                {order.scope_client_ip ? ` from ${order.scope_client_ip}` : ""}.
              </Text>
              <Text style={[styles.body, { marginTop: 6, color: colors.muted }]}>
                This document is legally binding. The client acknowledged every scope item
                individually before signing.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
                Pending signature
              </Text>
              <Text style={[styles.body, { color: colors.muted }]}>
                Client has not yet signed this scope.
              </Text>
            </>
          )}
        </View>

        <Text style={styles.footer} fixed>
          Forge · {order.order_number} · Scope of Work · Generated{" "}
          {formatDateTime(new Date().toISOString())}
        </Text>
      </Page>
    </Document>
  );
}
