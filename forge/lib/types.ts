export type UserRole = "owner" | "worker" | "client";

export type OrderStatus =
  | "draft"
  | "scope_pending"
  | "scope_signed"
  | "in_production"
  | "quality_check"
  | "completed"
  | "cancelled";

export type StageStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "approved"
  | "rework_requested"
  | "rework_submitted";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type GoldLossFlag = "normal" | "monitor" | "high" | "critical";

export type StoneType =
  | "diamond"
  | "ruby"
  | "emerald"
  | "sapphire"
  | "pearl"
  | "amethyst"
  | "topaz"
  | "opal"
  | "other";

export type StoneShape =
  | "round"
  | "oval"
  | "pear"
  | "princess"
  | "marquise"
  | "cushion"
  | "emerald_cut"
  | "asscher"
  | "radiant"
  | "heart"
  | "other";

export type StoneSource = "client_supplied" | "factory_supplied";

export interface User {
  id: string;
  supabase_auth_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  language_pref: string;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  address: string | null;
  notes: string | null;
  total_orders: number;
  total_spent_qar: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  assigned_worker_id: string | null;
  stage_template_id: string | null;
  piece_type: string;
  piece_description: string | null;
  karat: string;
  target_weight_grams: number | null;
  status: OrderStatus;
  current_stage_number: number;
  scope_locked: boolean;
  scope_signed_at: string | null;
  scope_client_ip: string | null;
  scope_device_fp: string | null;
  scope_pdf_url: string | null;
  reference_image_url: string | null;
  estimated_delivery: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScopeItem {
  id: string;
  order_id: string;
  sort_order: number;
  category: string;
  label: string;
  detail: string;
  client_ack: boolean;
  created_at: string;
}

export interface OrderStage {
  id: string;
  order_id: string;
  stage_number: number;
  stage_name: string;
  assigned_worker_id: string | null;
  started_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  gold_in_grams: number | null;
  gold_out_grams: number | null;
  gold_loss_grams: number | null;
  gold_loss_pct: number | null;
  gold_loss_flag: GoldLossFlag | null;
  status: StageStatus;
  worker_notes: string | null;
  owner_notes: string | null;
  rework_reason: string | null;
  photo_urls: string[];
  issue_photo_url: string | null;
  client_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderGemstone {
  id: string;
  order_id: string;
  stone_type: StoneType;
  stone_shape: StoneShape | null;
  qty_pieces: number;
  total_carats: number;
  carats_per_piece: number;
  colour_grade: string | null;
  clarity_grade: string | null;
  cut_grade: string | null;
  cert_number: string | null;
  cert_lab: string | null;
  source: StoneSource;
  estimated_value_qar: number | null;
  issued_to_worker_id: string | null;
  issued_at: string | null;
  issue_photo_url: string;
  issue_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StageGemstoneLog {
  id: string;
  stage_id: string;
  gem_id: string;
  qty_in_piece: number;
  qty_remaining_loose: number;
  qty_returned: number;
  qty_damaged: number;
  discrepancy_flag: boolean;
  discrepancy_notes: string | null;
  confirmation_photo_url: string | null;
  submitted_at: string | null;
  verified_by_owner: boolean;
  verified_at: string | null;
  created_at: string;
}

export interface StageTemplate {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface StageTemplateStep {
  id: string;
  template_id: string;
  step_number: number;
  step_name: string;
  description: string | null;
  requires_gold_log: boolean;
  requires_stone_log: boolean;
  requires_photo: boolean;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  client_id: string;
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  subtotal_qar: number;
  tax_pct: number;
  tax_amount_qar: number;
  total_qar: number;
  deposit_pct: number;
  deposit_amount_qar: number;
  deposit_paid_at: string | null;
  balance_due_qar: number;
  balance_paid_at: string | null;
  due_date: string | null;
  sent_at: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  label: string;
  qty: number;
  unit_price: number;
  total: number;
}

// --- 0005 gold inventory ---

export interface GoldSupplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoldPurchase {
  id: string;
  purchase_date: string;
  supplier_id: string | null;
  supplier_name: string | null;
  karat: string;
  weight_grams: number;
  price_per_gram: number;
  total_cost_qar: number;
  remaining_grams: number;
  invoice_ref: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoldConsumption {
  id: string;
  stage_id: string;
  purchase_id: string;
  grams: number;
  consumed_at: string;
  recorded_by: string | null;
  notes: string | null;
}

// --- 0006 stone inventory ---

export interface StoneSupplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoneAttrs {
  stone_type: StoneType;
  stone_shape?: StoneShape;
  size_mm?: number;
  colour_grade?: string;
  clarity_grade?: string;
  cut_grade?: string;
  cert_lab?: string;
  cert_number?: string;
  carats_total?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  unit: string;
  stock_qty: number;
  reorder_threshold: number | null;
  cost_per_unit_qar: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  stone_attrs: StoneAttrs | null;
  notes: string | null;
  last_restocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  order_id: string | null;
  qty_change: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

// --- 0007 worker_profiles extend ---

export interface WorkerProfile {
  id: string;
  user_id: string | null;
  specialisation: string[] | null;
  gold_loss_tolerance_pct: number;
  hourly_rate_qar: number | null;
  working_hours: string | null;
  hire_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
