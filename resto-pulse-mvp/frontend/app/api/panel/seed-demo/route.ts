import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr';

export async function POST() {
  try {
    const response = await fetch(`${API_BASE}/api/v1/dev/seed-panel-demo`, {
      method: 'POST',
      cache: 'no-store',
    });
    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: text || `Backend hata ${response.status}` },
        { status: response.status },
      );
    }
    return new NextResponse(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy hatasi';
    return NextResponse.json(
      {
        error: `Backend baglantisi kurulamadi (${API_BASE}). uvicorn calisiyor mu? Detay: ${message}`,
      },
      { status: 503 },
    );
  }
}
