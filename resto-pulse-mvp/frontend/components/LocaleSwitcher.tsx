'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { routing } from '@/i18n/routing';

const LOCALE_META: Record<string, { flag: string; name: string }> = {
  tr: { flag: '🇹🇷', name: 'Türkçe' },
  en: { flag: '🇬🇧', name: 'English' },
  de: { flag: '🇩🇪', name: 'Deutsch' },
  es: { flag: '🇪🇸', name: 'Español' },
  fr: { flag: '🇫🇷', name: 'Français' },
  it: { flag: '🇮🇹', name: 'Italiano' },
  pt: { flag: '🇵🇹', name: 'Português' },
  ru: { flag: '🇷🇺', name: 'Русский' },
  ar: { flag: '🇸🇦', name: 'العربية' },
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const current = LOCALE_META[locale] ?? LOCALE_META['tr']!;

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  function switchLocale(next: string) {
    setIsOpen(false);
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
        className={[
          'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
          'transition-colors disabled:opacity-50',
          isOpen
            ? 'border-[#FF6B35] bg-[#FF6B35]/10 text-[#FF6B35]'
            : 'border-border bg-surface-input text-content-muted hover:border-[#FF6B35]/60 hover:text-[#FF6B35]',
        ].join(' ')}
      >
        <span className="text-sm leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
        <svg
          className={`h-3 w-3 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={[
            'absolute z-50 mt-1.5 w-44 overflow-hidden rounded-xl',
            'border border-border bg-surface shadow-xl shadow-black/10',
            // Right-align on desktop, keep within viewport on mobile
            'right-0',
          ].join(' ')}
          role="listbox"
          aria-label="Languages"
        >
          <ul className="py-1">
            {routing.locales.map((code) => {
              const meta = LOCALE_META[code];
              if (!meta) return null;
              const isActive = code === locale;
              return (
                <li key={code} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => switchLocale(code)}
                    className={[
                      'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-[#FF6B35]/10 font-semibold text-[#FF6B35]'
                        : 'text-content-muted hover:bg-surface-input hover:text-content',
                    ].join(' ')}
                  >
                    <span className="text-base leading-none">{meta.flag}</span>
                    <span className="flex-1 text-left">{meta.name}</span>
                    {isActive && (
                      <svg
                        className="h-3.5 w-3.5 shrink-0 text-[#FF6B35]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
