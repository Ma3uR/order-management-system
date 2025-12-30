/**
 * Rozetka TTN (Delivery Waybill) Type Definitions
 */

/**
 * Package dimensions for Rozetka delivery
 */
export interface RozetkaDeliveryParams {
  weight: number; // Weight in kg
  length: number; // Length in cm
  width: number; // Width in cm
  height: number; // Height in cm
  volume: number; // Volume in cubic meters (calculated: length * width * height / 1000000)
}

/**
 * Sender information for Rozetka delivery
 */
export interface RozetkaDeliverySender {
  type: "legal" | "individual"; // Type of sender
  city: string; // City name
  address: string; // Full address
  department: string; // Department UUID
  name: string; // Sender name or company name
  phones: string[]; // Array of phone numbers
  info?: string; // Additional information (optional)
}

/**
 * Request body for creating Rozetka TTN
 */
export interface RozetkaTTNRequest {
  order_id: number; // Order ID from Rozetka
  payer: "sender"; // Always sender
  places: 1; // Always 1 package
  params: RozetkaDeliveryParams; // Package dimensions
  sender: RozetkaDeliverySender; // Sender information
  description?: string; // Shipment description (max 100 chars)
  has_paid?: boolean; // Is order fully paid (true) or COD expected (false)
  cost?: number; // COD amount (required if has_paid=false, must be 0 if has_paid=true)
  carrier?: 1 | 4; // 1 = ROZETKA Delivery (default), 4 = Meest
  registration_date?: string; // ISO date string
  return_operations?: string; // Return operations description
  departure_time?: string; // Departure time (e.g., "12:00")
}

/**
 * Response from Rozetka TTN creation API
 */
export interface RozetkaTTNResponse {
  success: boolean;
  content?: RozetkaTTNContent;
  errors?: RozetkaError;
}

/**
 * TTN content in successful response
 */
export interface RozetkaTTNContent {
  id: number; // TTN ID in Rozetka system
  ext_id: string; // External delivery service ID
  ttn: string; // TTN number
  seller_id: number; // Seller ID in Rozetka
  order_id: string; // Order ID
  delivery_service_id: number; // Delivery service ID
  delivery_service_pickup_id: number | null; // Pickup point ID
  receiver_fio: string; // Receiver name
  declared_price: number | null; // Declared value
  status_updated_at: string | null; // Status update timestamp
  delivery_price: number; // Delivery cost
  delivery_payer: number | null; // 0 = Sender, 1 = Receiver
  payment_type: number | null; // 0 = Cash, 1 = Card
  delivery_status_id: string; // Delivery status ID
  delivery_address: string | null; // Delivery address
  delivery_type: number | string; // 0 = To department, 1 = To address, or "door-door"
  oriented_delivery_date: string | null; // Expected delivery date
  receiver_phone: string; // Receiver phone
  comment: string; // Comment
  original_info: string | null; // Original creation data
  created_at: string; // TTN creation timestamp
  free_delivery: boolean; // Free delivery flag
  cod_amount: number; // COD amount
  has_prepaid: boolean; // Is prepaid
  is_carrier_meest: boolean; // Is Meest carrier
  carrier_track_num: string | null; // Carrier tracking number
  need_label: boolean; // Need additional labels
}

/**
 * Error response from Rozetka API
 */
export interface RozetkaError {
  message: string;
  code?: number;
  fields?: Record<string, string[]>; // Validation errors by field
}

/**
 * Carrier options for Rozetka delivery
 */
export enum RozetkaCarrier {
  RozetkaDelivery = 1,
  Meest = 4,
}

/**
 * Form data for TTN creation UI
 */
export interface RozetkaTTNFormData {
  // Package details
  weight: number;
  length: number;
  width: number;
  height: number;
  description: string;

  // Sender details
  senderType: "legal" | "individual";
  senderCity: string;
  senderAddress: string;
  senderDepartment: string;
  senderName: string;
  senderPhones: string[];
  senderInfo?: string;

  // Payment details
  hasPaid: boolean;
  codAmount: number;
  carrier: RozetkaCarrier;

  // Optional fields
  departureTime?: string;
  returnOperations?: string;
}
