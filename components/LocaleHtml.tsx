"use client";

import { useEffect } from "react";

export default function LocaleHtml({
  lang,
  dir,
}: {
  lang: string;
  dir?: "ltr" | "rtl";
}) {
  useEffect(() => {
    document.documentElement.lang = lang;
    if (dir) document.documentElement.dir = dir;
  }, [lang, dir]);

  return null;
}
