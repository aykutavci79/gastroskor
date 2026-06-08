/** Panel online siparis — zil sesi ve tarayici bildirimi */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => undefined);
  }
  return audioCtx;
}

/** Iki tonlu kisa zil — harici dosya gerektirmez */
export function playPanelOrderBell(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;

  const now = ctx.currentTime;
  const tones = [
    { freq: 880, start: 0, dur: 0.12 },
    { freq: 1175, start: 0.14, dur: 0.18 },
    { freq: 880, start: 0.38, dur: 0.14 },
  ];

  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = tone.freq;
    gain.gain.setValueAtTime(0.0001, now + tone.start);
    gain.gain.exponentialRampToValueAtTime(0.22, now + tone.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + tone.start);
    osc.stop(now + tone.start + tone.dur + 0.02);
  }
  return true;
}

export function primePanelOrderAudio(): void {
  playPanelOrderBell();
}

const BELL_REPEAT_MS = 12_000;

export type OrderAlertPayload = {
  id: string;
  customerPhone: string;
  totalTl: number;
  lineCount: number;
};

export function showPanelOrderNotification(payload: OrderAlertPayload): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const body = `${payload.totalTl.toFixed(0)} TL · ${payload.lineCount} kalem · ${payload.customerPhone}`;
  try {
    new Notification('Yeni online siparis', {
      body,
      tag: `order-${payload.id}`,
      requireInteraction: true,
    });
  } catch {
    // Safari / kisitli ortamlar
  }
}

export async function requestPanelOrderNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function startBackgroundBellLoop(shouldRing: () => boolean): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let timer: number | null = null;

  function tick() {
    if (document.visibilityState === 'visible') {
      stop();
      return;
    }
    if (shouldRing()) playPanelOrderBell();
  }

  function stop() {
    if (timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function onVisible() {
    if (document.visibilityState === 'visible') stop();
  }

  if (document.visibilityState !== 'visible' && shouldRing()) {
    timer = window.setInterval(tick, BELL_REPEAT_MS);
  }

  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVisible);
  };
}

export const PANEL_ORDER_SOUND_KEY = 'gastroskor_panel_order_sound';

export function readPanelOrderSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(PANEL_ORDER_SOUND_KEY);
  return raw !== '0';
}

export function writePanelOrderSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PANEL_ORDER_SOUND_KEY, enabled ? '1' : '0');
}
