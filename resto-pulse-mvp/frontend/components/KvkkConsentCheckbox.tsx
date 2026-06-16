'use client';

import Link from 'next/link';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
};

export function KvkkConsentCheckbox({ checked, onChange, id = 'kvkk-consent' }: Props) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-left text-sm text-content">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded border-border"
      />
      <span>
        <Link href="/kvkk" className="font-semibold text-accent hover:underline" target="_blank">
          KVKK aydınlatma metnini
        </Link>{' '}
        okudum; kişisel verilerimin işlenmesine{' '}
        <Link href="/gizlilik" className="text-accent hover:underline" target="_blank">
          gizlilik politikası
        </Link>{' '}
        kapsamında açık rıza veriyorum.
      </span>
    </label>
  );
}
