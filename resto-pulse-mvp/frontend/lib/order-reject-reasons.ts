export const ORDER_REJECT_REASONS = [
  { code: 'busy', label: 'Restoran cok yogun' },
  { code: 'product_unavailable', label: 'Urun stokta yok' },
  { code: 'no_courier', label: 'Kurye musait degil' },
  { code: 'closing', label: 'Restoran su an siparis alamiyor' },
  { code: 'other', label: 'Diger' },
] as const;

export type OrderRejectReasonCode = (typeof ORDER_REJECT_REASONS)[number]['code'];
