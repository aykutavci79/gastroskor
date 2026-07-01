import { useReservationAmbience } from '@/hooks/use-reservation-ambience';

/** online-rezervasyon stack icinde arka plan muzigi. */
export function ReservationAmbienceHost() {
  useReservationAmbience();
  return null;
}

/** Restoran listesi ekraninda arka plan muzigi. */
export function ReservationListAmbienceHost() {
  useReservationAmbience();
  return null;
}
