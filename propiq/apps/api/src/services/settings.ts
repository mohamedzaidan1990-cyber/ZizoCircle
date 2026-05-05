import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "../db/prisma";
import { Errors } from "../lib/errors";
import { storage } from "./storage";
import { sendEmail } from "./email";
import { env } from "../lib/env";

const BCRYPT_ROUNDS = 12;

// ── Agency profile ──────────────────────────────────────────────────────────

export interface PublicAgencyProfile {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  licenseNumber: string | null;
  country: string;
  city: string;
  logo: string | null;
  primaryColor: string | null;
  plan: string;
}

function toPublicProfile(a: {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  licenseNumber: string | null;
  country: string;
  city: string;
  logo: string | null;
  primaryColor: string | null;
  plan: string;
}): PublicAgencyProfile {
  return {
    id: a.id,
    name: a.name,
    nameAr: a.nameAr,
    slug: a.slug,
    licenseNumber: a.licenseNumber,
    country: a.country,
    city: a.city,
    logo: a.logo,
    primaryColor: a.primaryColor,
    plan: a.plan,
  };
}

export async function getAgencyProfile(
  agencyId: string,
): Promise<PublicAgencyProfile> {
  const a = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!a) throw Errors.notFound("Agency not found");
  return toPublicProfile(a);
}

export async function updateAgencyProfile(
  agencyId: string,
  input: {
    name?: string;
    nameAr?: string | null;
    licenseNumber?: string | null;
    country?: string;
    city?: string;
    primaryColor?: string | null;
  },
): Promise<PublicAgencyProfile> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) data[k] = v;
  }
  const a = await prisma.agency.update({ where: { id: agencyId }, data });
  return toPublicProfile(a);
}

export async function uploadAgencyLogo(
  agencyId: string,
  file: { originalname: string; mimetype: string; buffer: Buffer },
): Promise<PublicAgencyProfile> {
  const url = await storage().save(
    `agencies/${agencyId}`,
    file.originalname,
    file.mimetype,
    file.buffer,
  );
  // Remove the old logo if any.
  const existing = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { logo: true },
  });
  if (existing?.logo) {
    await storage().remove(existing.logo).catch(() => undefined);
  }
  const a = await prisma.agency.update({
    where: { id: agencyId },
    data: { logo: url },
  });
  return toPublicProfile(a);
}

// ── Team management ─────────────────────────────────────────────────────────

export interface PublicAgent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  language: string;
  isActive: boolean;
  invitedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export async function listAgents(agencyId: string): Promise<PublicAgent[]> {
  const users = await prisma.user.findMany({
    where: { agencyId },
    orderBy: { createdAt: "desc" },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    language: u.language,
    isActive: u.isActive,
    invitedAt: u.invitedAt?.toISOString() ?? null,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function inviteAgent(
  agencyId: string,
  input: {
    email: string;
    firstName: string;
    lastName: string;
    role: "AGENT" | "MANAGER";
  },
): Promise<{ user: PublicAgent; tempPassword: string }> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) throw Errors.duplicate("That email already has an account");

  const tempPassword = randomBytes(9).toString("base64url"); // ~12 chars
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      agencyId,
      invitedAt: new Date(),
    },
  });

  // Best-effort invite email — failures don't block the invite (e.g. if SMTP
  // is misconfigured locally, the temp password is still returned).
  try {
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    await sendEmail({
      to: user.email,
      subject: `You've been invited to ${agency?.name ?? "PropIQ"}`,
      html: `
        <p>Hi ${user.firstName},</p>
        <p>You have been invited to join <strong>${agency?.name ?? "PropIQ"}</strong> on PropIQ as an <strong>${user.role}</strong>.</p>
        <p>Sign in at <a href="${env.FRONTEND_URL}/en/login">${env.FRONTEND_URL}/en/login</a> with:</p>
        <ul>
          <li>Email: <strong>${user.email}</strong></li>
          <li>Temporary password: <strong>${tempPassword}</strong></li>
        </ul>
        <p>Please change your password after first login.</p>
      `,
    });
  } catch {
    // ignore — surface temp password to the inviter via API response.
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      language: user.language,
      isActive: user.isActive,
      invitedAt: user.invitedAt?.toISOString() ?? null,
      lastLoginAt: null,
      createdAt: user.createdAt.toISOString(),
    },
    tempPassword,
  };
}

export async function updateAgentRole(
  agencyId: string,
  userId: string,
  role: "AGENT" | "MANAGER",
): Promise<PublicAgent> {
  const u = await prisma.user.findFirst({ where: { id: userId, agencyId } });
  if (!u) throw Errors.notFound("Agent not found");
  // Don't allow changing the last AGENCY_ADMIN.
  if (u.role === "AGENCY_ADMIN") {
    throw Errors.forbidden("Cannot change the role of an agency admin");
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  return {
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    role: updated.role,
    language: updated.language,
    isActive: updated.isActive,
    invitedAt: updated.invitedAt?.toISOString() ?? null,
    lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function setAgentActive(
  agencyId: string,
  userId: string,
  isActive: boolean,
): Promise<PublicAgent> {
  const u = await prisma.user.findFirst({ where: { id: userId, agencyId } });
  if (!u) throw Errors.notFound("Agent not found");
  if (u.role === "AGENCY_ADMIN" && !isActive) {
    throw Errors.forbidden("Cannot deactivate the agency admin");
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });
  return {
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    role: updated.role,
    language: updated.language,
    isActive: updated.isActive,
    invitedAt: updated.invitedAt?.toISOString() ?? null,
    lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };
}

// ── Notification preferences ────────────────────────────────────────────────

export interface NotificationPrefs {
  newLeadAssignedEmail: boolean;
  newLeadAssignedWhatsapp: boolean;
  dealStageChangeEmail: boolean;
  dealStageChangeWhatsapp: boolean;
  activityDueEmail: boolean;
  activityDueWhatsapp: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  newLeadAssignedEmail: true,
  newLeadAssignedWhatsapp: false,
  dealStageChangeEmail: true,
  dealStageChangeWhatsapp: false,
  activityDueEmail: true,
  activityDueWhatsapp: false,
};

export async function getNotificationPrefs(
  userId: string,
): Promise<NotificationPrefs> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) throw Errors.notFound("User not found");
  const stored = (u.notificationPrefs ?? null) as Partial<NotificationPrefs> | null;
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(stored ?? {}) };
}

export async function setNotificationPrefs(
  userId: string,
  prefs: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const current = await getNotificationPrefs(userId);
  const merged = { ...current, ...prefs };
  await prisma.user.update({
    where: { id: userId },
    data: { notificationPrefs: merged },
  });
  return merged;
}

// ── Portal sync info ────────────────────────────────────────────────────────

export interface PortalSyncInfo {
  bayutFeedUrl: string;
  propertyFinderFeedUrl: string;
  propertyCount: number;
  /** Latest property updated_at (a proxy for "last data change") */
  lastUpdated: string | null;
}

import { withTenant } from "../db/tenant";

export async function getPortalSyncInfo(
  agencySlug: string,
): Promise<PortalSyncInfo> {
  const result = await withTenant(agencySlug, (client) =>
    client.query(
      `SELECT COUNT(*)::int AS count, MAX(updated_at)::text AS last_updated
       FROM properties WHERE status IN ('AVAILABLE', 'RESERVED')`,
    ),
  );
  const row = result.rows[0];
  const base = env.BACKEND_URL;
  return {
    bayutFeedUrl: `${base}/api/feeds/${agencySlug}/bayut.xml`,
    propertyFinderFeedUrl: `${base}/api/feeds/${agencySlug}/property-finder.xml`,
    propertyCount: Number(row?.count) || 0,
    lastUpdated: row?.last_updated ?? null,
  };
}
