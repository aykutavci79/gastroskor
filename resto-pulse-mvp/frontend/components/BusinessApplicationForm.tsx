'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';

import { getPanelContract, searchLivePlaces, submitBusinessApplication } from '@/lib/api';
import type { LivePlaceSearchItem, PanelContractInfo } from '@/lib/types';

export function BusinessApplicationForm() {
  const [contract, setContract] = useState<PanelContractInfo | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [panelEmail, setPanelEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bursa');
  const [website, setWebsite] = useState('');
  const [applicantNotes, setApplicantNotes] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<LivePlaceSearchItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<LivePlaceSearchItem | null>(null);
  const [taxFile, setTaxFile] = useState<File | null>(null);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [postalPromised, setPostalPromised] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const contractRef = useRef<HTMLElement>(null);

  useEffect(() => {
    getPanelContract()
      .then(setContract)
      .catch(() => setError('Sözleşme metni yüklenemedi. Sayfayı yenileyin.'));
  }, []);

  async function onSearchPlace() {
    if (!placeQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchLivePlaces({ q: placeQuery.trim(), city, limit: 6 });
      setPlaceResults(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mekan araması başarısız');
      setPlaceResults([]);
    } finally {
      setLoading(false);
    }
  }

  function onPrintContract() {
    if (!contractRef.current) return;
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!printWindow) {
      setError('Yazdırma penceresi açılamadı. Pop-up engelleyiciyi kapatın.');
      return;
    }
    printWindow.document.write(`
      <html><head><title>${contract?.title ?? 'Sözleşme'}</title>
      <style>body{font-family:Georgia,serif;padding:24px;line-height:1.5;white-space:pre-wrap}</style>
      </head><body>${contractRef.current.innerText}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!taxFile) {
      setError('Vergi levhası (PDF veya görsel) yükleyin.');
      return;
    }
    if (!selectedPlace) {
      setError('Google Maps üzerindeki işletmenizi listeden seçin.');
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
      form.append('address', address.trim());
      form.append('city', city.trim() || 'Bursa');
      if (website.trim()) form.append('website', website.trim());
      form.append('google_place_id', selectedPlace.place_id);
      form.append('google_place_name', selectedPlace.name);
      if (applicantNotes.trim()) form.append('applicant_notes', applicantNotes.trim());
      form.append('contract_accepted', contractAccepted ? 'true' : 'false');
      form.append('contract_postal_promised', postalPromised ? 'true' : 'false');
      form.append('tax_document', taxFile);
      await submitBusinessApplication(form);
      setSuccess(
        'Başvurunuz alındı. Onay sonrası panel e-postanıza bilgi gönderilecek. Sözleşmeyi yazdırıp imzalayarak deneme süresi bitmeden posta ile gönderin.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Başvuru gönderilemedi');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-emerald-50">
        <h2 className="text-lg font-semibold">Başvuru alındı</h2>
        <p className="mt-2 text-sm">{success}</p>
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
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="rounded-2xl border border-border/70 bg-surface-input p-6 space-y-4">
        <h2 className="text-lg font-semibold text-content">İşletme bilgileri</h2>
        <p className="text-sm text-content-muted">
          Panel e-postası, daha sonra Google ile giriş yapacağınız adresle aynı olmalıdır.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-content-muted">İşletme adı (ticari unvan)</span>
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-content"
            />
          </label>
          <label className="block text-sm">
            <span className="text-content-muted">Yetkili adı soyadı</span>
            <input
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-content"
            />
          </label>
          <label className="block text-sm">
            <span className="text-content-muted">Panel e-postası (Google hesabı)</span>
            <input
              required
              type="email"
              value={panelEmail}
              onChange={(e) => setPanelEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-content"
            />
          </label>
          <label className="block text-sm">
            <span className="text-content-muted">Telefon</span>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xx xxx xx xx"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-content"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-content-muted">Adres</span>
          <textarea
            required
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-content"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-content-muted">Şehir</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-content"
            />
          </label>
          <label className="block text-sm">
            <span className="text-content-muted">Web sitesi (isteğe bağlı)</span>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-content"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-surface-input p-6 space-y-4">
        <h2 className="text-lg font-semibold text-content">Google Maps mekanı</h2>
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
            placeholder="Örn: Özşark Yaprak Döner Bursa"
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-content"
          />
          <button
            type="button"
            onClick={() => void onSearchPlace()}
            disabled={loading}
            className="btn-primary btn-sm shrink-0">
            Ara
          </button>
        </div>
        {selectedPlace ? (
          <p className="text-sm text-emerald-200">
            Seçili: <strong>{selectedPlace.name}</strong> — {selectedPlace.address}
          </p>
        ) : null}
        {placeResults.length > 0 ? (
          <ul className="space-y-2">
            {placeResults.map((place) => (
              <li key={place.place_id}>
                <button
                  type="button"
                  onClick={() => setSelectedPlace(place)}
                  className={`w-full rounded-xl border p-3 text-left text-sm ${
                    selectedPlace?.place_id === place.place_id
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-border bg-surface/80'
                  }`}>
                  <p className="font-medium text-content">{place.name}</p>
                  <p className="text-xs text-content-muted">{place.address}</p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border/70 bg-surface-input p-6 space-y-4">
        <h2 className="text-lg font-semibold text-content">Vergi levhası</h2>
        <p className="text-sm text-content-muted">
          PDF veya net okunabilir fotoğraf (en fazla 8 MB). Başvuru incelemesi için kullanılır; herkese açık
          yayınlanmaz.
        </p>
        <input
          required
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setTaxFile(e.target.files?.[0] ?? null)}
          className="text-sm text-content-muted"
        />
      </section>

      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-brand-gold">{contract?.title ?? 'Hizmet sözleşmesi'}</h2>
          <button
            type="button"
            onClick={onPrintContract}
            className="rounded-lg border border-amber-400/50 px-3 py-1.5 text-xs font-semibold text-brand-gold">
            Yazdır / PDF kaydet
          </button>
        </div>
        <p className="text-xs text-content-muted">
          KVKK kapsamında müşteri sipariş verilerini işlediğiniz için veri işleyen sözleşmesi niteliğindedir.
          Deneme süresi boyunca panel kullanılabilir; imzalı nüsha ulaşmazsa deneme bitiminde panel kapatılır.
        </p>
        <article
          ref={contractRef}
          className="max-h-72 overflow-y-auto rounded-xl border border-border bg-surface/80 p-4 text-xs leading-relaxed text-content-muted whitespace-pre-wrap">
          {contract?.text ?? 'Yükleniyor...'}
        </article>
        <label className="flex items-start gap-2 text-sm text-content">
          <input
            type="checkbox"
            checked={contractAccepted}
            onChange={(e) => setContractAccepted(e.target.checked)}
            className="mt-1 rounded border-border"
          />
          <span>Sözleşmeyi okudum ve elektronik ortamda kabul ediyorum.</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-content">
          <input
            type="checkbox"
            checked={postalPromised}
            onChange={(e) => setPostalPromised(e.target.checked)}
            className="mt-1 rounded border-border"
          />
          <span>
            İmzalı sözleşme nüshasını deneme süresi bitmeden posta ile göndereceğimi taahhüt ediyorum. Gönderim
            adresi onay e-postasında paylaşılır.
          </span>
        </label>
      </section>

      <label className="block text-sm">
        <span className="text-content-muted">Ek not (isteğe bağlı)</span>
        <textarea
          rows={3}
          value={applicantNotes}
          onChange={(e) => setApplicantNotes(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-content"
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={loading || !contractAccepted || !postalPromised}
        className="btn-primary w-full sm:w-auto disabled:opacity-50">
        {loading ? 'Gönderiliyor...' : 'Başvuruyu gönder'}
      </button>
    </form>
  );
}
