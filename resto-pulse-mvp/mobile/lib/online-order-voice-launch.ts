/** Siri / Shortcuts / deep link ile Online Siparis + mikrofon acilisi. */

export type OnlineOrderVoiceLaunch = {
  openVoice: boolean;
  orderText?: string;
};

function readParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  return value || null;
}

function truthy(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'siri';
}

export function parseOnlineOrderVoiceLaunch(input: string | null | undefined): OnlineOrderVoiceLaunch {
  if (!input?.trim()) return { openVoice: false };

  try {
    const url = input.includes('://') ? new URL(input) : new URL(input, 'gastroskor://app');
    const path = url.pathname.replace(/^\/+/, '').toLowerCase();
    const host = url.hostname.toLowerCase();

    const isOrderPath =
      path === 'siparis-acik' ||
      path === 'siparis' ||
      path === 'online-siparis' ||
      host === 'siparis-acik' ||
      host === 'siparis';

    const voiceFlag =
      truthy(readParam(url.searchParams, 'voice')) ||
      truthy(readParam(url.searchParams, 'mic')) ||
      truthy(readParam(url.searchParams, 'siri'));

    const orderText =
      readParam(url.searchParams, 'text') ??
      readParam(url.searchParams, 'q') ??
      readParam(url.searchParams, 'order');

    if (!isOrderPath && !voiceFlag) return { openVoice: false };

    return {
      openVoice: isOrderPath || voiceFlag,
      orderText: orderText ?? undefined,
    };
  } catch {
    return { openVoice: false };
  }
}

export function parseOnlineOrderVoiceRouteParams(params: Record<string, string | string[] | undefined>): OnlineOrderVoiceLaunch {
  const pick = (key: string): string | null => {
    const raw = params[key];
    if (Array.isArray(raw)) return raw[0]?.trim() || null;
    return raw?.trim() || null;
  };

  const voiceFlag =
    truthy(pick('voice')) || truthy(pick('mic')) || truthy(pick('siri'));

  const orderText = pick('text') ?? pick('q') ?? pick('order');

  return {
    openVoice: voiceFlag,
    orderText: orderText ?? undefined,
  };
}
