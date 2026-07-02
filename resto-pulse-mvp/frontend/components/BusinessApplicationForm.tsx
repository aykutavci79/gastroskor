'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';

import { searchLivePlaces, submitBusinessApplication } from '@/lib/api';
import type { LivePlaceSearchItem } from '@/lib/types';

export function BusinessApplicationForm() {
  const t = useTranslations('businessApply');
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [panelEmail, setPanelEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<LivePlaceSearchItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<LivePlaceSearchItem | null>(null);
  const [applicantNotes, setApplicantNotes] = useState('');
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSearchPlace() {
    if (!placeQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchLivePlaces({ q: placeQuery.trim(), city, limit: 6 });
      setPlaceResults(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('placeSearchError'));
      setPlaceResults([]);
    } finally {
      setLoading(false);
    }
  }

  function selectPlace(place: LivePlaceSearchItem) {
    setSelectedPlace(place);
    if (!businessName.trim()) {
      setBusinessName(place.name);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedPlace) {
      setError(t('placeRequired'));
      return;
    }
    if (!kvkkConsent) {
      setError(t('kvkkRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.append('business_name', businessName.trim());
      form.append('contact_name', contactName.trim());
      form.append('panel_email', panelEmail.trim().toLowerCase());
      form.append('phone', phone.trim());
      form.append('address', selectedPlace.address?.trim() || selectedPlace.name);
      form.append('city', city.trim());
      form.append('google_place_id', selectedPlace.place_id);
      form.append('google_place_name', selectedPlace.name);
      if (applicantNotes.trim()) form.append('applicant_notes', applicantNotes.trim());
      form.append('kvkk_consent', kvkkConsent ? 'true' : 'false');
      await submitBusinessApplication(form);
      setSuccess(t('successMessage'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('submitError'));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <h2 className="text-lg font-semibold">{t('successTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed">{success}</p>
        <p className="mt-3 text-sm leading-relaxed text-emerald-800">{t('successTrialNote')}</p>
        <p className="mt-3 text-sm">
          Panel açıldığında aynı e-posta ile{' '}
          <Link href="/panel" className="underline">
            Google girişi
          </Link>{' '}
          yapın.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white/95 p-6 shadow-sm backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-neutral-900">{t('formTitle')}</h2>
        <p className="text-sm text-neutral-600">{t('formHint')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-neutral-600">{t('businessName')}</span>
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">{t('contactName')}</span>
            <input
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">{t('panelEmail')}</span>
            <input
              required
              type="email"
              value={panelEmail}
              onChange={(e) => setPanelEmail(e.target.value)}
              placeholder="ornek@gmail.com"
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">{t('phone')}</span>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xx xxx xx xx"
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">{t('city')}</span>
            <input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t('cityPlaceholder')}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white/95 p-6 shadow-sm backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-neutral-900">{t('placeSectionTitle')}</h2>
        <div className="flex gap-2">
          <input
            value={placeQuery}
            onChange={(e) => setPlaceQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void onSearchPlace();
              }
            }}
            placeholder={t('placePlaceholder')}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900"
          />
          <button
            type="button"
            onClick={() => void onSearchPlace()}
            disabled={loading}
            className="btn-primary btn-sm shrink-0">
            {t('placeSearch')}
          </button>
        </div>
        {selectedPlace ? (
          <p className="text-sm text-emerald-700">
            {t('placeSelected')}: <strong>{selectedPlace.name}</strong> — {selectedPlace.address}
          </p>
        ) : null}
        {placeResults.length > 0 ? (
          <ul className="space-y-2">
            {placeResults.map((place) => (
              <li key={place.place_id}>
                <button
                  type="button"
                  onClick={() => selectPlace(place)}
                  className={`w-full rounded-xl border p-3 text-left text-sm ${
                    selectedPlace?.place_id === place.place_id
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-neutral-200 bg-white'
                  }`}>
                  <p className="font-medium text-neutral-900">{place.name}</p>
                  <p className="text-xs text-neutral-600">{place.address}</p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <label className="block text-sm">
        <span className="text-neutral-600">{t('notes')}</span>
        <textarea
          rows={2}
          value={applicantNotes}
          onChange={(e) => setApplicantNotes(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          checked={kvkkConsent}
          onChange={(e) => setKvkkConsent(e.target.checked)}
          className="mt-1 rounded border-neutral-300"
        />
        <span>
          <Link href="/gizlilik" className="text-orange-600 underline">
            KVKK / gizlilik metnini
          </Link>{' '}
          okudum, iletişim için onaylıyorum.
        </span>
      </label>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      ) : null}

      <button type="submit" disabled={loading || !kvkkConsent} className="btn-primary w-full py-3 text-base disabled:opacity-50">
        {loading ? t('submitting') : t('submit')}
      </button>

      <p className="text-xs leading-relaxed text-neutral-500">{t('fullFormLater')}</p>
    </form>
  );
}
