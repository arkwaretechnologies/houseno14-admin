import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasDemoCookie } from "@/lib/demo-mode";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isDemo = hasDemoCookie(request.cookies);

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth");

  const isPublicRoute =
    isAuthRoute ||
    request.nextUrl.pathname.startsWith("/tv/display") ||
    request.nextUrl.pathname === "/";

  if (
    !user &&
    !isDemo &&
    !isPublicRoute &&
    request.nextUrl.pathname.startsWith("/")
  ) {
    const protectedPrefixes = [
      "/dashboard",
      "/members",
      "/memberships",
      "/wallet",
      "/rfid",
      "/attendance",
      "/courts",
      "/reservations",
      "/queue",
      "/matches",
      "/tournaments",
      "/rankings",
      "/tv",
      "/reports",
      "/inventory",
      "/services",
      "/promotions",
      "/notifications",
      "/staff",
      "/settings",
      "/analytics",
      "/ai",
    ];

    const needsAuth = protectedPrefixes.some((p) =>
      request.nextUrl.pathname.startsWith(p)
    );

    if (needsAuth) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Keep /login as the default entry page — do not auto-bounce authenticated users to dashboard.

  return supabaseResponse;
}
