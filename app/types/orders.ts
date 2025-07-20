// Rozetka API types
export interface RozetkaOrderResponse {
  id: number;
  market_id?: number;
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
    item_price?: string;
  }>;
  seller_comment: string[];
  seller_comment_created: string;
  current_seller_comment: string;
  comment: string;
  user_phone: string;
  user_title?: {
    first_name: string;
    last_name: string;
    second_name: string;
    full_name: string;
  };
  user_rating: number;
  recipient_phone?: string;
  recipient_title?: {
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
  duplicate_order_id: number | null;
  is_delivery_edit_available: boolean;
  is_reserve_ending?: boolean;
  can_prolong?: boolean;
  is_review_request_send?: number;
  review_request_status?: string;
  user: {
    id: number;
    has_email: boolean;
    contact_fio: string;
    email: string | boolean;
  };
  chatUser?: {
    id: number;
    created: string;
    updated: string;
    subject: string;
    user: {
      id: number;
      has_email: boolean;
      contact_fio: string;
      email: string | boolean;
    };
    read_market: null;
    trash_market: number;
    star_market: number;
    order_id: number;
    type: number;
    item_id: null;
    user_id: number;
  };
  chatMessages?: Array<unknown>;
  order_status_history?: Array<{
    status_id: number;
    created: string;
    status: {
      id: number;
      name: string;
      name_uk: string;
      name_en: string;
      status_group: number;
      status: number;
      color: string;
      title: string;
    };
  }>;
  delivery: {
    delivery_service_id: number;
    delivery_service_name: string;
    recipient_title: string;
    recipient_first_name?: string;
    recipient_last_name?: string;
    recipient_second_name?: string;
    recipient_phone?: string;
    another_recipient?: boolean;
    place_id: number;
    pickup_rz_id?: string;
    place_street: string;
    place_number: string;
    place_house: string;
    place_flat: null | string;
    cost: null | string;
    reserve_date?: string | null;
    city: {
      id: number;
      uuid?: string;
      city_name?: string;
      name: string;
      name_ua: string;
      name_en?: string;
      region_title: string;
      title: string;
      status: number;
    };
    delivery_method_id: number;
    ref_id: string;
    name_logo: string;
    email: null | string;
    street_directory_id?: null;
    street_id?: null;
    delivery_date?: null;
  };
  purchases?: Array<{
    id: number;
    cost: string;
    cost_with_discount: string;
    price: string;
    price_with_discount: string;
    quantity: number;
    item_id: number;
    item_name: string;
    item: {
      id: number;
      name: string;
      name_ua: null | string;
      article: string;
      price_offer_id: string;
      price: string;
      catalog_category: {
        id: number;
        name: string;
        parent_id: number;
      };
      catalog_id: number;
      group_id: null | number;
      photo_preview: string;
      photo: Array<string>;
      moderation_status: number;
      sla_id: number;
      url: string;
      sold: number;
      uploader_offer_id: string;
      uploader_status: null | string;
    };
    kit_id: number;
    conf_details: null | unknown;
    ttn: null | string;
    order_status: null | number;
    status: number;
    is_additional_item: boolean;
  }>;
  status_available?: Array<{
    parent_id: number;
    child_id: number;
    id: number;
    delivery_type: number;
    market_group: number;
    status?: number;
    name?: string;
    name_uk?: string;
    name_en?: string;
    status_group?: number;
    color?: string;
    title?: string;
  }>;
  status_data: {
    id: number;
    name: string;
    name_uk: string;
    name_en: string;
    status_group: number;
    status: number;
    color: string;
    title?: string;
  };
  is_receiver_edit_available?: boolean;
  payment_method_id: number;
  payment_type?: string;
  payment_type_title?: string;
  payment_type_name?: string;
  credit_status?: number;
  credit_info?: Array<unknown>;
  delivery_service?: {
    id: number;
    name: string;
    type: number;
    status: number;
    can_edit: boolean;
    can_use: boolean;
  };
  credit_broker?: boolean;
  feedback?: Array<{
    id: number;
    comment: string;
  }>;
  feedback_count?: number;
  is_promo?: boolean;
  prro?: {
    prro_receipt_status: number;
    prro_receipt_service_name: string;
  };
  market_review?: {
    id: number;
    status: string;
    comment: string;
    vote: string;
    vote_convenience: string;
    vote_manager: string;
    vote_delivery: string;
    user: string;
    review_convenience: null | string;
    review_manager: null | string;
    review_delivery: null | string;
    read: boolean;
  };
  last_update_status?: string;
  reminder_to_check_payment_for_duplicates?: {
    to_show_reminder: boolean;
    message: null | string;
  };
  invoice_exist?: boolean;
  can_create_invoice?: boolean;
  delivery_commission_info?: {
    percentage_commission: string;
    absolute_commission: string;
    calculated_commission: string;
  };
  count_buyers_orders?: number;
  rz_delivery_ttn_sender?: {
    city: string;
    info: null | unknown;
    name: string;
    type: string;
    phones: Array<string>;
    address: string;
    department: string;
  };
  has_kit?: boolean;
  carrier?: {
    carrier: null | unknown;
    carrier_inner_id: null | unknown;
    carrier_track_num: null | unknown;
    is_carrier_meest: boolean;
  };
  is_payed?: boolean;
  prro_receipt_status?: number | boolean;
}