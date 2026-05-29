'use client';

import { useEffect, useState } from 'react';

import { getPanelNotificationPreferences, updatePanelNotificationPreferences } from '@/lib/api';
import type { PanelNotificationPreferences } from '@/lib/types';

type Props = {
  userEmail: string;
};

type ToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface/70 px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-content">{label}</span>
        {description ? <span className="mt-1 block text-xs text-content-muted">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-accent"
      />
    </label>
  );
}

export function PanelNotificationSettings({ userEmail }: Props) {
  const [prefs, setPrefs] = useState<PanelNotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPanelNotificationPreferences(userEmail)
      .then(setPrefs)
      .catch(() => setPrefs(null));
  }, [userEmail]);

  async function save(next: PanelNotificationPreferences) {
    setSaving(true);
    setMessage(null);
    try {
      const data = await updatePanelNotificationPreferences({
        user_email: userEmail,
        ...next,
      });
      setPrefs(data);
      setMessage('Ayarlar kaydedildi.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  function patch(partial: Partial<PanelNotificationPreferences>) {
    if (!prefs) return;
    const next = { ...prefs, ...partial };
    setPrefs(next);
    void save(next);
  }

  if (!prefs) {
    return (
      <section id="notification-settings" className="rounded-2xl border border-border/70 bg-surface-input p-5">
        <h2 className="text-lg font-semibold text-content">Bildirim Ayarlari</h2>
        <p className="mt-2 text-sm text-content-muted">Ayarlar yukleniyor...</p>
      </section>
    );
  }

  return (
    <section id="notification-settings" className="rounded-2xl border border-border/70 bg-surface-input p-5">
      <h2 className="text-lg font-semibold text-content">Bildirim Ayarlari</h2>
      <p className="mt-1 text-sm text-content-muted">
        E-posta ve panel ici bildirimleri buradan kapatabilirsiniz.
      </p>
      <div className="mt-4 space-y-2">
        <ToggleRow
          label="E-posta bildirimleri"
          description="Onemli uyarılar e-posta adresinize gider."
          checked={prefs.email_enabled}
          onChange={(email_enabled) => patch({ email_enabled })}
        />
        <ToggleRow
          label="Panel ici bildirimler"
          description="Dashboard uzerindeki bildirim merkezinde gosterilir."
          checked={prefs.in_app_enabled}
          onChange={(in_app_enabled) => patch({ in_app_enabled })}
        />
        <ToggleRow
          label="Analiz hatirlatmalari"
          checked={prefs.analysis_reminders}
          onChange={(analysis_reminders) => patch({ analysis_reminders })}
        />
        <ToggleRow
          label="Deneme suresi uyarilari"
          checked={prefs.trial_reminders}
          onChange={(trial_reminders) => patch({ trial_reminders })}
        />
        <ToggleRow
          label="Olumsuz yorum alarmlari"
          checked={prefs.negative_review_alerts}
          onChange={(negative_review_alerts) => patch({ negative_review_alerts })}
        />
        <ToggleRow
          label="Rakip guncelleme alarmlari"
          checked={prefs.competitor_alerts}
          onChange={(competitor_alerts) => patch({ competitor_alerts })}
        />
      </div>
      {saving ? <p className="mt-3 text-xs text-content-muted">Kaydediliyor...</p> : null}
      {message ? <p className="mt-3 text-xs text-success">{message}</p> : null}
    </section>
  );
}
