import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';

import { startReservationAmbience, stopReservationAmbience } from '@/lib/reservation-ambience';

/** Rezervasyon ekranlarinda odak varken salon muzigi calar, cikinca durur. */
export function useReservationAmbience(): void {
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused) return undefined;

    void startReservationAmbience();
    return () => {
      void stopReservationAmbience();
    };
  }, [focused]);
}
