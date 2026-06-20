import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type Arazi = { id: string; ad: string; lat?: number | null; lng?: number | null };
type Ayarlar = { araziler?: Arazi[]; push_tokens?: string[] };

const YARIN_ESIK = 60;
const UC_GUN_ESIK = 80;
const MODEL_GUCLU_MIN = 2;

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function yagisTahmini(lat: number, lng: number): Promise<number[] | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
    `&longitude=${lng}` +
    '&daily=precipitation_probability_max&forecast_days=4&timezone=auto';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { daily?: { precipitation_probability_max?: number[] } };
  const arr = data.daily?.precipitation_probability_max;
  if (!Array.isArray(arr)) return null;
  return arr.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
}

async function yagisTahminiOpenWeather(lat: number, lng: number): Promise<number[] | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;
  const url =
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}` +
    `&lon=${lng}&exclude=minutely,hourly,alerts,current&units=metric&appid=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { daily?: Array<{ pop?: number }> };
  if (!Array.isArray(data.daily)) return null;
  const pops = data.daily
    .slice(0, 4)
    .map((d) => (typeof d.pop === 'number' && Number.isFinite(d.pop) ? Math.round(d.pop * 100) : null))
    .filter((x): x is number => typeof x === 'number');
  return pops.length > 0 ? pops : null;
}

async function expoPushGonder(tokens: string[], title: string, body: string, data: Record<string, unknown>) {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({ to, sound: 'default', title, body, data }));
  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const secret = process.env.BAHCE_CRON_SECRET ?? '';
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const dryRun =
      req.nextUrl.searchParams.get('dryRun') === '1' ||
      req.nextUrl.searchParams.get('dry_run') === '1';

    const sb = supabaseAdmin();
    const { data, error } = await sb.from('kullanici_ayarlari').select('user_id, ayarlar');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let kullaniciSayisi = 0;
    let bildirimSayisi = 0;
    const dryRunRapor: Array<{
      user_id: string;
      tokenSayisi: number;
      araziSayisi: number;
      riskler: string[];
      detay?: Array<{
        araziId: string;
        ad: string;
        yarinMeteo: number;
        yarinOW: number;
        ucGunMeteo: number;
        ucGunOW: number;
        karar: string;
      }>;
    }> = [];

    for (const row of data ?? []) {
      const ayarlar = (row.ayarlar ?? {}) as Ayarlar;
      const tokens = (ayarlar.push_tokens ?? []).filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken['));
      const araziler = Array.isArray(ayarlar.araziler) ? ayarlar.araziler : [];
      if (tokens.length === 0 || araziler.length === 0) continue;

      const riskSatirlari: string[] = [];
      const detay: NonNullable<(typeof dryRunRapor)[0]['detay']> = [];
      for (const a of araziler) {
        if (typeof a.lat !== 'number' || typeof a.lng !== 'number') continue;
        const [meteo, openWeather] = await Promise.all([
          yagisTahmini(a.lat, a.lng),
          yagisTahminiOpenWeather(a.lat, a.lng),
        ]);
        const yarinMeteo = Math.round(meteo?.[1] ?? 0);
        const yarinOW = Math.round(openWeather?.[1] ?? 0);
        const ucGunMeteo = Math.round(Math.max(...(meteo?.slice(1, 4) ?? [0]), 0));
        const ucGunOW = Math.round(Math.max(...(openWeather?.slice(1, 4) ?? [0]), 0));

        const yarinModelSayisi =
          (yarinMeteo >= YARIN_ESIK ? 1 : 0) + (yarinOW >= YARIN_ESIK ? 1 : 0);
        const ucGunModelSayisi =
          (ucGunMeteo >= UC_GUN_ESIK ? 1 : 0) + (ucGunOW >= UC_GUN_ESIK ? 1 : 0);
        const yarinMax = Math.max(yarinMeteo, yarinOW);
        const ucGunMax = Math.max(ucGunMeteo, ucGunOW);

        let karar = 'yok';
        if (yarinModelSayisi >= MODEL_GUCLU_MIN) {
          riskSatirlari.push(`${a.ad}: yarın %${yarinMax} (2/2 model güçlü)`);
          karar = 'yarin_2_2';
        } else if (ucGunModelSayisi >= MODEL_GUCLU_MIN) {
          riskSatirlari.push(`${a.ad}: 3 gün içinde %${ucGunMax} (2/2 model güçlü)`);
          karar = 'uc_gun_2_2';
        } else if (yarinModelSayisi === 1 && yarinMax >= YARIN_ESIK) {
          riskSatirlari.push(`${a.ad}: yarın %${yarinMax} (1/2 model temkinli)`);
          karar = 'yarin_1_2';
        } else if (ucGunModelSayisi === 1 && ucGunMax >= UC_GUN_ESIK) {
          riskSatirlari.push(`${a.ad}: 3 gün içinde %${ucGunMax} (1/2 model temkinli)`);
          karar = 'uc_gun_1_2';
        }
        if (dryRun) {
          detay.push({
            araziId: a.id,
            ad: a.ad,
            yarinMeteo,
            yarinOW,
            ucGunMeteo,
            ucGunOW,
            karar,
          });
        }
      }

      if (dryRun) {
        dryRunRapor.push({
          user_id: row.user_id as string,
          tokenSayisi: tokens.length,
          araziSayisi: araziler.length,
          riskler: riskSatirlari,
          detay,
        });
      }

      if (riskSatirlari.length === 0) continue;
      if (!dryRun) {
        const kisa = riskSatirlari.slice(0, 3).join(' | ');
        const fazlasi = riskSatirlari.length > 3 ? ` (+${riskSatirlari.length - 3} arazi)` : '';
        await expoPushGonder(
          [...new Set(tokens)],
          'Bahçe Ustası - Yağış riski',
          `${kisa}${fazlasi}. Açık alanda planlanan işlemleri gözden geçirin.`,
          { type: 'arazi-hava-risk-cron', riskCount: riskSatirlari.length },
        );
        kullaniciSayisi += 1;
        bildirimSayisi += tokens.length;
      }
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        kullaniciKaydi: dryRunRapor.length,
        rapor: dryRunRapor,
      });
    }

    return NextResponse.json({ ok: true, kullaniciSayisi, bildirimSayisi });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

