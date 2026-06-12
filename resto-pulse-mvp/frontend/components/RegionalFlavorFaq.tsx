'use client';

import { useState } from 'react';

import type { RegionalFlavorFaqItem } from '@/lib/regional-flavor-page-content';

type Props = {
  items: RegionalFlavorFaqItem[];
};

export function RegionalFlavorFaq({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="regional-flavor-faq-heading">
      <h2 id="regional-flavor-faq-heading" className="text-xl font-semibold text-content">
        Sık sorulan sorular
      </h2>
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-surface-card">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={item.question}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-surface-input/40"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : index)}>
                <span className="font-medium text-content">{item.question}</span>
                <span className="shrink-0 text-lg text-brand" aria-hidden>
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen ? (
                <div className="border-t border-border/50 px-4 pb-4 pt-2 text-sm leading-relaxed text-content-muted">
                  {item.answer}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
