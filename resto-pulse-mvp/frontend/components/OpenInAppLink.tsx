'use client';

import { useMemo } from 'react';

type Props = {
  restaurantId: string;
  webPath?: string;
  className?: string;
};

function isAndroidPhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/** WhatsApp ic tarayici App Link acmaz; intent:// veya custom scheme dener. */
export function OpenInAppLink({ restaurantId, webPath, className }: Props) {
  const href = useMemo(() => {
    const id = encodeURIComponent(restaurantId);
    const webUrl = `https://www.gastroskor.com.tr${webPath ?? `/restaurants/${id}`}`;
    if (isAndroidPhone()) {
      const fallback = encodeURIComponent(webUrl);
      const path = webPath ?? `/restaurants/${id}`;
      return `intent://www.gastroskor.com.tr${path}#Intent;scheme=https;package=com.gastroskor.app;S.browser_fallback_url=${fallback};end`;
    }
    return `gastroskor://restaurant/${id}`;
  }, [restaurantId, webPath]);

  return (
    <a
      href={href}
      className={
        className ??
        'inline-flex items-center gap-1 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/15'
      }>
      Uygulamada aç
    </a>
  );
}
