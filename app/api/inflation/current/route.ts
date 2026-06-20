import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type EvdsItem = Record<string, string>

function parseTrNumber(value: string | undefined): number | null {
  if (!value) return null
  const normalized = value.replace(/\./g, '').replace(',', '.').trim()
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function pickSeriesValue(item: EvdsItem): number | null {
  for (const [k, v] of Object.entries(item)) {
    if (k === 'Tarih' || k === 'UNIXTIME') continue
    const parsed = parseTrNumber(v)
    if (parsed !== null) return parsed
  }
  return null
}

export async function GET() {
  const apiKey = process.env.TCMB_EVDS_API_KEY
  const seriesCode = process.env.TCMB_EVDS_CPI_SERIES ?? 'TP.FE.OKTG01'

  if (!apiKey) {
    return NextResponse.json(
      { error: 'TCMB_EVDS_API_KEY eksik' },
      { status: 500 }
    )
  }

  try {
    const now = new Date()
    const endDate = `${String(now.getDate()).padStart(2, '0')}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-${now.getFullYear()}`

    const start = new Date(now.getFullYear(), now.getMonth() - 16, 1)
    const startDate = `01-${String(start.getMonth() + 1).padStart(2, '0')}-${start.getFullYear()}`

    const params = new URLSearchParams({
      series: seriesCode,
      startDate,
      endDate,
      frequency: '5',
      type: 'json',
    })

    // EVDS 2024 sonrası API key header üzerinden alınır.
    const evdsUrl = `https://evds2.tcmb.gov.tr/service/evds/${params.toString()}`
    const response = await fetch(evdsUrl, {
      headers: { key: apiKey },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `TCMB EVDS hatası: ${response.status}` },
        { status: 502 }
      )
    }

    const payload = await response.json()
    const items: EvdsItem[] = Array.isArray(payload?.items) ? payload.items : []
    const points = items
      .map((item) => ({
        date: item.Tarih,
        value: pickSeriesValue(item),
      }))
      .filter((x): x is { date: string; value: number } => Boolean(x.date) && x.value !== null)
      .sort((a, b) => {
        const aDate = new Date(a.date.split('-').reverse().join('-')).getTime()
        const bDate = new Date(b.date.split('-').reverse().join('-')).getTime()
        return aDate - bDate
      })

    if (points.length < 2) {
      return NextResponse.json(
        { error: 'TCMB serisi aylık enflasyon için yeterli veri dönmedi' },
        { status: 502 }
      )
    }

    const last = points[points.length - 1]
    const prev = points[points.length - 2]
    const monthlyRate = prev.value > 0 ? last.value / prev.value - 1 : 0

    return NextResponse.json({
      monthlyRate: Math.max(0, monthlyRate),
      annualPct: monthlyRate * 12 * 100,
      period: last.date,
      source: `TCMB EVDS (${seriesCode})`,
    })
  } catch (error) {
    console.error('TCMB inflation proxy error:', error)
    return NextResponse.json(
      { error: 'TCMB enflasyon verisi alınamadı' },
      { status: 500 }
    )
  }
}

