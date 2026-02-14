import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Next/static/api dosyalarına dokunma
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // EN: /en/oyku/... yanlışsa /en/story/... yap
  if (pathname === "/en/oyku" || pathname.startsWith("/en/oyku/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en\/oyku(\/|$)/, "/en/story$1");
    url.search = search;
    return NextResponse.redirect(url); // default 307
  }

  // FR: /fr/oyku/... yanlışsa /fr/story/... yap
  if (pathname === "/fr/oyku" || pathname.startsWith("/fr/oyku/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/fr\/oyku(\/|$)/, "/fr/story$1");
    url.search = search;
    return NextResponse.redirect(url); // default 307
  }

  // AR: /ar/story/... yanlışsa /ar/oyku/... yap
  if (pathname === "/ar/story" || pathname.startsWith("/ar/story/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/ar\/story(\/|$)/, "/ar/oyku$1");
    url.search = search;
    return NextResponse.redirect(url); // default 307
  }

  // /tr canonical redirect
  if (pathname === "/tr" || pathname.startsWith("/tr/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/tr(\/|$)/, "/");
    url.search = search;
    return NextResponse.redirect(url); // default 307
  }

  // ✅ Sadece normal akışta header ekliyoruz (route değiştirmiyoruz)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
