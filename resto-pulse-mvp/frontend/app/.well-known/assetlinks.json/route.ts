const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE_NAME ?? 'com.gastroskor.app';

function readFingerprints(): string[] {
  const raw = process.env.ANDROID_SHA256_FINGERPRINTS ?? '';
  const fromEnv = raw
    .split(/[\s,]+/)
    .map((item) => item.trim().replace(/:/g, '').toUpperCase())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  // Play App Signing + EAS upload key — Vercel env'e eklendikten sonra Android App Links dogrulanir.
  return [];
}

export function GET() {
  const fingerprints = readFingerprints();
  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
