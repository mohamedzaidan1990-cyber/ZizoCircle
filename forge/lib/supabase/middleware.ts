import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/lib/types";

const PORTAL_PREFIXES: Record<UserRole, string> = {
  owner: "/owner",
  worker: "/worker",
  client: "/client",
};

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/sign-out"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!authUser && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (authUser && (pathname === "/" || pathname === "/login")) {
    const role = await fetchRole(supabase, authUser.id);
    const url = request.nextUrl.clone();
    url.pathname = role ? PORTAL_PREFIXES[role] : "/login";
    url.searchParams.delete("next");
    if (!role) url.searchParams.set("error", "no-role");
    return NextResponse.redirect(url);
  }

  if (authUser) {
    const role = await fetchRole(supabase, authUser.id);
    if (!role) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "no-role");
      return NextResponse.redirect(url);
    }
    const wrongPortal = (Object.entries(PORTAL_PREFIXES) as [UserRole, string][])
      .filter(([r]) => r !== role)
      .some(([, prefix]) => pathname.startsWith(prefix));
    if (wrongPortal) {
      const url = request.nextUrl.clone();
      url.pathname = PORTAL_PREFIXES[role];
      return NextResponse.redirect(url);
    }
  }

  return response;
}

async function fetchRole(
  supabase: ReturnType<typeof createServerClient>,
  authUserId: string
): Promise<UserRole | null> {
  const { data } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("supabase_auth_id", authUserId)
    .maybeSingle();
  const row = data as { role?: string; is_active?: boolean } | null;
  if (!row || row.is_active === false) return null;
  if (row.role === "owner" || row.role === "worker" || row.role === "client") {
    return row.role;
  }
  return null;
}
