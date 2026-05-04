import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import {
  createTenantSchema,
  dropTenantSchema,
  tenantSchemaExists,
} from "../db/tenant";
import { Errors } from "../lib/errors";
import {
  generateRefreshToken,
  hashRefreshToken,
  parseDurationMs,
  signAccessToken,
} from "../lib/jwt";
import { env } from "../lib/env";
import type {
  AuthResponse,
  PublicAgency,
  PublicUser,
  Language,
} from "@propiq/shared";

const BCRYPT_ROUNDS = 12;

interface RegisterInput {
  agencyName: string;
  agencyNameAr?: string;
  slug: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  language?: Language;
}

interface LoginInput {
  email: string;
  password: string;
}

function toPublicAgency(a: {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  country: string;
  city: string;
  plan: string;
  logo: string | null;
  primaryColor: string | null;
}): PublicAgency {
  return {
    id: a.id,
    name: a.name,
    nameAr: a.nameAr,
    slug: a.slug,
    country: a.country,
    city: a.city,
    plan: a.plan as PublicAgency["plan"],
    logo: a.logo,
    primaryColor: a.primaryColor,
  };
}

function toPublicUser(u: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  phone: string | null;
  avatar: string | null;
  role: string;
  language: string;
  agencyId: string;
}): PublicUser {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    firstNameAr: u.firstNameAr,
    lastNameAr: u.lastNameAr,
    phone: u.phone,
    avatar: u.avatar,
    role: u.role as PublicUser["role"],
    language: u.language as PublicUser["language"],
    agencyId: u.agencyId,
  };
}

async function issueTokens(user: {
  id: string;
  agencyId: string;
  role: string;
  language: string;
}, agencySlug: string): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({
    userId: user.id,
    agencyId: user.agencyId,
    agencySlug,
    role: user.role as PublicUser["role"],
    language: user.language as PublicUser["language"],
  });
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(
    Date.now() + parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN),
  );
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt,
    },
  });
  return { accessToken, refreshToken };
}

export async function registerAgency(
  input: RegisterInput,
): Promise<AuthResponse> {
  const slug = input.slug.toLowerCase();

  const existingAgency = await prisma.agency.findUnique({ where: { slug } });
  if (existingAgency) throw Errors.duplicate("Agency slug already taken");

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existingUser) throw Errors.duplicate("Email already registered");

  if (await tenantSchemaExists(slug)) {
    throw Errors.duplicate("Tenant schema already exists for this slug");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Create the tenant schema first, so a failure aborts before any public rows
  // are written. If the public-row create fails afterwards we drop it.
  await createTenantSchema(slug);

  let agencyId: string | null = null;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: input.agencyName,
          nameAr: input.agencyNameAr,
          slug,
        },
      });
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: "AGENCY_ADMIN",
          language: input.language ?? "EN",
          agencyId: agency.id,
        },
      });
      return { agency, user };
    });
    agencyId = result.agency.id;

    const tokens = await issueTokens(result.user, slug);
    return {
      agency: toPublicAgency(result.agency),
      user: toPublicUser(result.user),
      ...tokens,
    };
  } catch (err) {
    if (!agencyId) {
      await dropTenantSchema(slug).catch(() => undefined);
    }
    throw err;
  }
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: { agency: true },
  });
  if (!user || !user.isActive) throw Errors.unauthorized("Invalid credentials");

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw Errors.unauthorized("Invalid credentials");

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await issueTokens(user, user.agency.slug);
  return {
    agency: toPublicAgency(user.agency),
    user: toPublicUser(user),
    ...tokens,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
}> {
  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { agency: true } } },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw Errors.unauthorized("Invalid or expired refresh token");
  }
  if (!stored.user.isActive) throw Errors.unauthorized("User disabled");

  const accessToken = signAccessToken({
    userId: stored.user.id,
    agencyId: stored.user.agencyId,
    agencySlug: stored.user.agency.slug,
    role: stored.user.role as PublicUser["role"],
    language: stored.user.language as PublicUser["language"],
  });
  return { accessToken };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.refreshToken
    .update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}
