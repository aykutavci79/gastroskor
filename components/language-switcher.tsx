"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

type Locale = "tr" | "en" | "fr" | "ar";
const LOCALES: Locale[] = ["tr", "en", "fr", "ar"];

function detectLocale(pathname: string): Locale {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname === "/fr" || pathname.startsWith("/fr/")) return "fr";
  if (pathname === "/ar" || pathname.startsWith("/ar/")) return "ar";
  return "tr";
}

function splitPath(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

function isHome(pathname: string, loc: Locale) {
  if (loc === "tr") return pathname === "/";
  return pathname === `/${loc}`;
}

function isAbout(pathname: string, loc: Locale) {
  if (loc === "tr") return pathname === "/hakkimizda";
  if (loc === "ar") return pathname === "/ar/hakkimizda";
  return pathname === `/${loc}/about`;
}

function isContact(pathname: string, loc: Locale) {
  if (loc === "tr") return pathname === "/iletisim";
  if (loc === "ar") return pathname === "/ar/iletisim";
  return pathname === `/${loc}/contact`;
}

/**
 * Story detail route'larını tanı:
 * - TR: /oyku/:slug
 * - TR (legacy): /deri/:slug veya /kemik/:slug (bazı yerlerde üretilmiş olabilir)
 * - EN/FR: /en/oyku/:slug veya /en/story/:slug veya /en/deri/:slug|/en/kemik/:slug
 * - AR: /ar/oyku/:slug veya /ar/story/:slug veya /ar/deri/:slug|/ar/kemik/:slug
 *
 * ÖNEMLİ: Sadece "slug varsa" detail say.
 * /ar/deri (liste) detail değildir.
 */
function isStoryDetail(pathname: string, loc: Locale) {
  const s = splitPath(pathname);

  const isAuthorSeg = (seg?: string) => seg === "deri" || seg === "kemik";

  if (loc === "tr") {
    // /oyku/:slug
    if (s[0] === "oyku" && !!s[1]) return true;
    // /deri/:slug or /kemik/:slug (legacy)
    if (isAuthorSeg(s[0]) && !!s[1]) return true;
    return false;
  }

  // non-tr: prefix always exists
  if (s[0] !== loc) return false;

  // /{loc}/oyku/:slug or /{loc}/story/:slug
  if ((s[1] === "oyku" || s[1] === "story") && !!s[2]) return true;

  // /{loc}/deri/:slug or /{loc}/kemik/:slug
  if (isAuthorSeg(s[1]) && !!s[2]) return true;

  return false;
}

function getStorySlug(pathname: string, loc: Locale) {
  const s = splitPath(pathname);

  const isAuthorSeg = (seg?: string) => seg === "deri" || seg === "kemik";

  if (loc === "tr") {
    // /oyku/:slug
    if (s[0] === "oyku") return s[1] ?? null;
    // /deri/:slug or /kemik/:slug
    if (isAuthorSeg(s[0])) return s[1] ?? null;
    return null;
  }

  // non-tr: /{loc}/...
  if (s[0] !== loc) return null;

  // /{loc}/oyku/:slug or /{loc}/story/:slug
  if (s[1] === "oyku" || s[1] === "story") return s[2] ?? null;

  // /{loc}/deri/:slug or /{loc}/kemik/:slug
  if (isAuthorSeg(s[1])) return s[2] ?? null;

  return null;
}

/**
 * Tek gerçek story route'u ÜRET:
 * TR -> /oyku/:slug
 * others -> /{lang}/oyku/:slug
 */
function buildStoryPath(target: Locale, slug: string) {
  if (target === "tr") return `/oyku/${slug}`;
  return `/${target}/oyku/${slug}`;
}

function buildStaticPath(target: Locale, kind: "home" | "about" | "contact") {
  if (kind === "home") return target === "tr" ? "/" : `/${target}`;

  if (kind === "about") {
    if (target === "tr") return "/hakkimizda";
    if (target === "ar") return "/ar/hakkimizda";
    return `/${target}/about`;
  }

  if (target === "tr") return "/iletisim";
  if (target === "ar") return "/ar/iletisim";
  return `/${target}/contact`;
}

function fallbackSwapLocale(pathname: string, from: Locale, to: Locale) {
  const s = splitPath(pathname);
  const withoutPrefix = from === "tr" ? s : s[0] === from ? s.slice(1) : s;

  if (to === "tr") return "/" + withoutPrefix.join("/");
  return "/" + [to, ...withoutPrefix].join("/");
}

async function fetchTranslatedSlug(from: Locale, to: Locale, slug: string) {
  const url = `/api/story-translation?from=${encodeURIComponent(
    from
  )}&to=${encodeURIComponent(to)}&slug=${encodeURIComponent(slug)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json()) as { ok: boolean; slug: string | null };
  return data.ok ? data.slug : null;
}

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const current = detectLocale(pathname);

  const [loadingLocale, setLoadingLocale] = React.useState<Locale | null>(null);

  const go = async (target: Locale) => {
    if (target === current) return;

    // static pages
    if (isHome(pathname, current)) {
      router.push(buildStaticPath(target, "home"));
      return;
    }
    if (isAbout(pathname, current)) {
      router.push(buildStaticPath(target, "about"));
      return;
    }
    if (isContact(pathname, current)) {
      router.push(buildStaticPath(target, "contact"));
      return;
    }

    // story detail (oyku + author routes)
    if (isStoryDetail(pathname, current)) {
      const slug = getStorySlug(pathname, current);
      if (!slug) {
        router.push(buildStaticPath(target, "home"));
        return;
      }

      setLoadingLocale(target);
      try {
        const translatedSlug = await fetchTranslatedSlug(current, target, slug);

        if (translatedSlug) {
          router.push(buildStoryPath(target, translatedSlug)); // ✅ always /oyku
          return;
        }

        router.push(buildStaticPath(target, "home"));
        return;
      } finally {
        setLoadingLocale(null);
      }
    }

    // unknown pages: best effort
    router.push(fallbackSwapLocale(pathname, current, target));
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/60 px-2 py-1">
      {LOCALES.map((loc) => {
        const active = loc === current;
        const busy = loadingLocale === loc;

        return (
          <button
            key={loc}
            type="button"
            onClick={() => go(loc)}
            disabled={busy}
            className={[
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100",
              busy ? "opacity-70 cursor-wait" : "",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
            title={loc.toUpperCase()}
          >
            {loc.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
