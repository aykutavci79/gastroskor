"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type Locale = "tr" | "en" | "fr" | "ar";
const LOCALES: Locale[] = ["tr", "en", "fr", "ar"];

function detectLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";
  if (seg === "en" || seg === "fr" || seg === "ar") return seg;
  if (seg === "tr") return "tr";
  return "tr";
}

function stripLocalePrefix(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0];
  if (first === "en" || first === "fr" || first === "ar" || first === "tr") {
    const rest = parts.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname || "/";
}

function withLocale(pathWithoutLocale: string, locale: Locale): string {
  const clean = pathWithoutLocale.startsWith("/")
    ? pathWithoutLocale
    : `/${pathWithoutLocale}`;

  if (locale === "tr") return clean;
  if (clean === "/") return `/${locale}`;
  return `/${locale}${clean}`;
}

// ✅ TR tarzı slug kullanan diller: TR + AR
function isTrStyleLocale(locale: Locale) {
  return locale === "tr" || locale === "ar";
}

/**
 * Dil değiştirirken statik sayfaları doğru slug'a çevir:
 * TR/AR: hakkimizda, iletisim, ara
 * EN/FR: about, contact, search
 */
function translateStaticPath(path: string, from: Locale, to: Locale): string {
  const clean = path === "" ? "/" : path;
  if (clean === "/") return "/";

  const first = clean.split("/").filter(Boolean)[0] ?? "";

  const fromTrStyle = isTrStyleLocale(from);
  const toTrStyle = isTrStyleLocale(to);

  // TR/AR -> EN/FR
  if (fromTrStyle && !toTrStyle) {
    if (first === "hakkimizda") return "/about";
    if (first === "iletisim") return "/contact";
    if (first === "ara") return "/search";
    return clean;
  }

  // EN/FR -> TR/AR
  if (!fromTrStyle && toTrStyle) {
    if (first === "about") return "/hakkimizda";
    if (first === "contact") return "/iletisim";
    if (first === "search") return "/ara";
    return clean;
  }

  // aynı grup içi (TR<->AR ya da EN<->FR): aynen taşı
  return clean;
}

const TEXT: Record<
  Locale,
  {
    home: string;
    deri: string;
    kemik: string;
    about: string;
    contact: string;
    search: string;
  }
> = {
  tr: {
    home: "Ana Sayfa",
    deri: "Deri'nin Öyküleri",
    kemik: "Kemik'in Öyküleri",
    about: "Hakkımızda",
    contact: "İletişim",
    search: "Ara",
  },
  en: {
    home: "Home",
    deri: "Deri’s Stories",
    kemik: "Kemik’s Stories",
    about: "About",
    contact: "Contact",
    search: "Search",
  },
  fr: {
    home: "Accueil",
    deri: "Histoires de Deri",
    kemik: "Histoires de Kemik",
    about: "À propos",
    contact: "Contact",
    search: "Rechercher",
  },
  ar: {
    home: "الرئيسية",
    deri: "قصص ديري",
    kemik: "قصص كيميك",
    about: "من نحن",
    contact: "تواصل",
    search: "بحث",
  },
};

type StoryCtx =
  | { kind: "authorRoute"; author: "deri" | "kemik"; slug: string }
  | { kind: "storyRoute"; slug: string; segment: "oyku" | "story" };

function getStoryContext(basePath: string): StoryCtx | null {
  const parts = basePath.split("/").filter(Boolean);

  // /deri/:slug OR /kemik/:slug
  if (
    parts.length === 2 &&
    (parts[0] === "deri" || parts[0] === "kemik") &&
    parts[1]
  ) {
    return { kind: "authorRoute", author: parts[0], slug: parts[1] };
  }

  // ✅ Story detail: support BOTH /story/:slug and /oyku/:slug
  if (parts.length === 2 && (parts[0] === "story" || parts[0] === "oyku") && parts[1]) {
    return { kind: "storyRoute", slug: parts[1], segment: parts[0] as "oyku" | "story" };
  }

  return null;
}

function storySegmentForLocale(locale: Locale) {
  // TR + AR -> /oyku/...
  // EN + FR -> /story/...
  return isTrStyleLocale(locale) ? "oyku" : "story";
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const locale = useMemo(() => detectLocaleFromPath(pathname), [pathname]);
  const basePath = useMemo(() => stripLocalePrefix(pathname), [pathname]);

  const t = TEXT[locale];
  const isAr = locale === "ar";

  const nav = useMemo(() => {
    const aboutPath = isTrStyleLocale(locale) ? "/hakkimizda" : "/about";
    const contactPath = isTrStyleLocale(locale) ? "/iletisim" : "/contact";
    const searchPath = isTrStyleLocale(locale) ? "/ara" : "/search";

    return [
      { key: "home", label: t.home, href: withLocale("/", locale) },
      { key: "deri", label: t.deri, href: withLocale("/deri", locale) },
      { key: "kemik", label: t.kemik, href: withLocale("/kemik", locale) },
      { key: "about", label: t.about, href: withLocale(aboutPath, locale) },
      { key: "contact", label: t.contact, href: withLocale(contactPath, locale) },
      { key: "search", label: t.search, href: withLocale(searchPath, locale) },
    ] as const;
  }, [locale, t]);

  const storyCtx = useMemo(() => getStoryContext(basePath), [basePath]);
  const [loadingLocale, setLoadingLocale] = useState<Locale | null>(null);

  const resolveAndGo = useCallback(
    async (targetLocale: Locale) => {
      if (targetLocale === locale) return;

      // Story değilse: translate edip taşı
      if (!storyCtx) {
        const translated = translateStaticPath(basePath, locale, targetLocale);
        router.push(withLocale(translated, targetLocale));
        return;
      }

      setLoadingLocale(targetLocale);

      const fallback =
        storyCtx.kind === "authorRoute"
          ? withLocale(`/${storyCtx.author}`, targetLocale)
          : withLocale("/", targetLocale);

      try {
        const qs = new URLSearchParams({
          from: locale,
          to: targetLocale,
          slug: storyCtx.slug,
        });

        const res = await fetch(`/api/stories/resolve?${qs.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          router.push(fallback);
          return;
        }

        const data = (await res.json()) as { slug?: string } | null;

        if (!data?.slug) {
          router.push(fallback);
          return;
        }

        if (storyCtx.kind === "authorRoute") {
          router.push(withLocale(`/${storyCtx.author}/${data.slug}`, targetLocale));
        } else {
          const seg = storySegmentForLocale(targetLocale);
          router.push(withLocale(`/${seg}/${data.slug}`, targetLocale));
        }
      } catch {
        router.push(fallback);
      } finally {
        setLoadingLocale(null);
      }
    },
    [basePath, locale, router, storyCtx]
  );

  const languageLinks = useMemo(() => {
    return LOCALES.map((l) => {
      const href = storyCtx
        ? storyCtx.kind === "authorRoute"
          ? withLocale(`/${storyCtx.author}`, l)
          : withLocale("/", l)
        : withLocale(translateStaticPath(basePath, locale, l), l);

      return {
        locale: l,
        href,
        active: l === locale,
        label: l.toUpperCase(),
      };
    });
  }, [basePath, locale, storyCtx]);

  const searchHref = useMemo(() => {
    const item = nav.find((x) => x.key === "search");
    return item?.href ?? withLocale("/ara", locale);
  }, [nav, locale]);

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className={[
            "flex items-center justify-between py-4",
            isAr ? "flex-row-reverse" : "",
          ].join(" ")}
        >
          <Link href={withLocale("/", locale)} className="text-lg font-semibold tracking-tight">
            Deri &amp; Kemik
          </Link>

          <nav
            className={[
              "hidden md:flex items-center gap-6 text-sm text-muted-foreground",
              isAr ? "flex-row-reverse" : "",
            ].join(" ")}
          >
            {nav
              .filter((x) => x.key !== "search")
              .map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ))}
          </nav>

          <div
            className={[
              "flex items-center gap-3",
              isAr ? "flex-row-reverse" : "",
            ].join(" ")}
          >
            <Link
              href={searchHref}
              className="rounded-full border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              {t.search}
            </Link>

            <div className="flex items-center rounded-full border p-1">
              {languageLinks.map((l) => {
                const disabled = l.active || loadingLocale === l.locale;

                return (
                  <Link
                    key={l.locale}
                    href={l.href}
                    onClick={(e) => {
                      if (storyCtx) {
                        e.preventDefault();
                        if (!disabled) void resolveAndGo(l.locale);
                      }
                    }}
                    aria-disabled={disabled}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      l.active
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                      loadingLocale === l.locale ? "opacity-60 pointer-events-none" : "",
                    ].join(" ")}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
