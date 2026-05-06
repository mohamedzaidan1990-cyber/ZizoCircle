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

  // IMPORTANT: getUser() revalidates the session token; do not skip.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/" || pathname === "/login")) {
    const role = await fetchRole(supabase, user.id);
    const url = request.nextUrl.clone();
    url.pathname = role ? PORTAL_PREFIXES[role] : "/login";
    url.searchParams.delete("next");
    if (!role) url.searchParams.set("error", "no-role");
    return NextResponse.redirect(url);
  }

  if (user) {
    const role = await fetchRole(supabase, user.id);
    if (!role) {
      // Signed in but no role assigned — bounce to login with notice.
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
  userId: string
): Promise<UserRole | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  if (role === "owner" || role === "worker" || role === "client") return role;
  return null;
}
