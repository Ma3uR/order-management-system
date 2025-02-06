// Rozetka API types
export interface RozetkaOrderResponse {
  id: number;
  market_id: number;
  created: string;
  changed: string; //TODO: compare this witn my pb data, if they change i need update my oreder
  amount: string;
  amount_with_discount: string;
  cost: string;
  cost_with_discount: string;
  status: number;
  status_group: number;
  items_photos: Array<{
    id: number;
    url: string;
    item_url: string;
    item_name: string;
    item_price: string;
  }>;
  seller_comment: string[];
  seller_comment_created: string;
  current_seller_comment: string;
  comment: string;
  user_phone: string;
  user_title: {
    first_name: string;
    last_name: string;
    second_name: string;
    full_name: string;
  };
  user_rating: number;
  recipient_phone: string;
  recipient_title: {
    first_name: string;
    last_name: string;
    second_name: string;
    full_name: string;
  };
  from_warehouse: number;
  ttn: string;
  total_quantity: number;
  mk_created: boolean;
  can_copy: boolean;
  created_type: number;
  is_viewed: boolean;
  callback_off: number;
  is_fulfillment: boolean;
  duplicate_order_id: null;
  is_delivery_edit_available: boolean;
  can_prolong: boolean;
  is_review_request_send: number;
  review_request_status: string;
  user: {
    id: number;
    has_email: boolean;
    contact_fio: string;
    email: string;
  };
  delivery: {
    delivery_service_id: number;
    delivery_service_name: string;
    recipient_title: string;
    recipient_first_name: string;
    recipient_last_name: string;
    recipient_second_name: string;
    recipient_phone: string;
    another_recipient: boolean;
    place_id: number;
    pickup_rz_id: string;
    place_street: string;
    place_number: string;
    place_house: string;
    place_flat: null;
    cost: null;
    city: {
      id: number;
      uuid: string;
      city_name: string;
      name: string;
      name_ua: string;
      name_en: string;
      region_title: string;
      title: string;
      status: number;
    };
    delivery_method_id: number;
    ref_id: string;
    name_logo: string;
    email: null;
    street_directory_id: null;
    street_id: null;
    reserve_date: null;
    delivery_date: null;
  };
  status_data: {
    id: number;
    name: string;
    name_uk: string;
    name_en: string;
    status_group: number;
    status: number;
    color: string;
    title: string;
  };
  payment_method_id: number;
}