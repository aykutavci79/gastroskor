const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID ?? '5XTXAT7BXZ';
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.gastroskor.app';

export function GET() {
  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`,
          paths: ['/restaurants/*', '/place/*'],
        },
      ],
    },
  };

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
