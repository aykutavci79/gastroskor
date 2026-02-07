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
 * Accept both possible story segment variants while parsing:
 * - TR: /oyku/:slug
 * - EN/FR: /en/story/:slug (but also accept /en/oyku/:slug if something produced it)
 * - AR: /ar/oyku/:slug (but also accept /ar/story/:slug just in case)
 */
function isStoryDetail(pathname: string, loc: Locale) {
  const s = splitPath(pathname);

  if (loc === "tr") return s[0] === "oyku" && !!s[1];

  if (loc === "en" || loc === "fr") {
    return s[0] === loc && (s[1] === "story" || s[1] === "oyku") && !!s[2];
  }

  if (loc === "ar") {
    return s[0] === "ar" && (s[1] === "oyku" || s[1] === "story") && !!s[2];
  }

  return false;
}

function getStorySlug(pathname: string, loc: Locale) {
  const s = splitPath(pathname);

  if (loc === "tr") return s[1] ?? null;
  if (loc === "en" || loc === "fr") return s[2] ?? null;
  if (loc === "ar") return s[2] ?? null;
  return null;
}

/**
 * Build final story path per locale.
 * (These are the routes you described/used)
 */
function buildStoryPath(target: Locale, slug: string) {
  if (target === "tr") return `/oyku/${slug}`;
  if (target === "ar") return `/ar/oyku/${slug}`;
  return `/${target}/story/${slug}`; // en/fr
}

function buildStaticPath(target: Locale, kind: "home" | "about" | "contact") {
  if (kind === "home") return target === "tr" ? "/" : `/${target}`;

  if (kind === "about") {
    if (target === "tr") return "/hakkimizda";
    if (target === "ar") return "/ar/hakkimizda";
    return `/${target}/about`;
  }

  // contact
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

    // Static pages
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

    // Story detail: resolve slug via DB using originalStoryId mapping
    if (isStoryDetail(pathname, current)) {
      const slug = getStorySlug(pathname, current);
      if (!slug) {
        router.push(buildStaticPath(target, "home"));
        return;
      }

      setLoadingLocale(target);
      try {
        const translatedSlug = await fetchTranslatedSlug(current, target, slug);

        // If translation exists -> go to correct story URL
        if (translatedSlug) {
          router.push(buildStoryPath(target, translatedSlug));
          return;
        }

        // If translation does not exist -> go to home in that language (safe fallback)
        router.push(buildStaticPath(target, "home"));
        return;
      } finally {
        setLoadingLocale(null);
      }
    }

    // Unknown pages: best effort
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
              active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100",
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
