import type { Router } from 'expo-router';

/** DM ekranlarindan guvenli cikis — gecmis yoksa Keşfet'e don. */
export function exitDmScreen(router: Router): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)' as never);
}
