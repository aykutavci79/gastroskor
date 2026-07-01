export type OrderPaymentMethodCode =
  | 'cash'
  | 'card_at_door'
  | 'multinet'
  | 'pluxee'
  | 'ticket'
  | 'setcard'
  | 'metropol'
  | 'paye'
  | 'tokenflex'
  | 'yemekmatik'
  | 'edenred'
  | 'winwin';

export const ORDER_PAYMENT_METHOD_OPTIONS: { code: OrderPaymentMethodCode; label: string }[] = [
  { code: 'cash', label: 'Kapıda nakit' },
  { code: 'card_at_door', label: 'Kapıda kredi / banka kartı' },
  { code: 'multinet', label: 'Multinet' },
  { code: 'pluxee', label: 'Pluxee (Sodexo)' },
  { code: 'ticket', label: 'Ticket Restaurant (Edenred)' },
  { code: 'setcard', label: 'Setcard' },
  { code: 'metropol', label: 'MetropolCard' },
  { code: 'paye', label: 'Paye Kart' },
  { code: 'tokenflex', label: 'Token Flex' },
  { code: 'yemekmatik', label: 'Yemekmatik' },
  { code: 'edenred', label: 'Edenred' },
  { code: 'winwin', label: 'Winwin' },
];

export const DEFAULT_ORDER_PAYMENT_METHODS: OrderPaymentMethodCode[] = ['cash', 'card_at_door'];
