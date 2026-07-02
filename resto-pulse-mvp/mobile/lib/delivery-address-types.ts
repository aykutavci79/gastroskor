export type AddressNodeItem = {
  id: number;
  name: string;
  level: string;
  parent_id: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type AddressNodeListResponse = {
  items: AddressNodeItem[];
  parent_id: number | null;
  city: string;
};

export type DeliveryAddressValidateResponse = {
  formatted_address: string;
  latitude: number;
  longitude: number;
  street_node_id: number;
  door_number: string;
};

export type StoredDeliveryAddress = {
  streetNodeId: number;
  doorNumber: string;
  formatted: string;
  latitude: number;
  longitude: number;
  note?: string;
  district: string;
  neighborhood: string;
  street: string;
};

export type DeliveryAddressSelection = {
  district: AddressNodeItem | null;
  neighborhood: AddressNodeItem | null;
  street: AddressNodeItem | null;
  doorNumber: string;
  note: string;
};
