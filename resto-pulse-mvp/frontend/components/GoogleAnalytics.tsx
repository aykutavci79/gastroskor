'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { Suspense, useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== 'function') return;
    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    window.gtag('config', GA_ID, { page_path: pagePath });
  }, [pathname, searchParams]);

  return null;
}

export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
      <Suspense fallback={null}>
        <GoogleAnalyticsPageView />
      </Suspense>
    </>
  );
}
