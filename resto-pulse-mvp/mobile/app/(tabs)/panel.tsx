import { Redirect } from 'expo-router';

/** Isletme paneli mobilde kapali — web panel kullanilir. */
export default function PanelScreen() {
  return <Redirect href="/(tabs)/index" />;
}
