// Rozetka API types
export interface RozetkaOrderResponse {
  id: number;
  created: string;
  changed: string;
  amount: string;
  status: number;
  user_phone: string;
  comment: string;
  items_photos: Array<{
    id: number;
    url: string;
    item_url: string;
    item_name: string;
    item_price: string;
    quantity?: number;
    price?: string;
  }>;
  total_quantity: number;
  user_title: {
    full_name: string;
  };
  delivery: {
    delivery_service_name: string;
    place_number?: string;
  };
  status_data: {
    name_uk: string;
    color: string;
  };
  payment_type: string;
  delivery_type: string;
}

// Your application's order type (based on your existing schema)
export interface Order {
  id: string;
  orderNumber: string;
  source: string;
  deliveryMethod?: {
    id: string;
    name: string;
  };
  deliveryPostNumber: string | null;
  phoneNumber: string;
  fullName: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  numberOfItems: number;
  paymentMethod?: {
    id: string;
    name: string;
  };
  amount: number;
  status?: {
    id: string;
    name: string;
    color: string;
  };
  currency: {
    id: string;
    code: string;
    symbol: string;
  };
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// Mapping function to convert Rozetka order to your application's order
export function mapRozetkaOrderToOrder(rozetkaOrder: RozetkaOrderResponse): Order {
  const products = rozetkaOrder.items_photos.map(item => ({
    name: item.item_name,
    quantity: item.quantity || 1,
    price: parseFloat(item.item_price || '0')
  }));

  return {
    id: rozetkaOrder.id.toString(),
    orderNumber: rozetkaOrder.id.toString(),
    source: '4tvf116a5aitwmb',
    phoneNumber: rozetkaOrder.user_phone,
    fullName: rozetkaOrder.user_title?.full_name || 'Unknown',
    products,
    numberOfItems: rozetkaOrder.total_quantity,
    amount: parseFloat(rozetkaOrder.amount),
    status: {
      id: rozetkaOrder.status.toString(),
      name: rozetkaOrder.status_data.name_uk,
      color: rozetkaOrder.status_data.color
    },
    paymentMethod: {
      id: '72p22vqr2viqrnw',
      name: 'Prepayment'
    },
    currency: {
      id: 'UAH',
      code: 'UAH',
      symbol: '₴'
    },
    createdAt: rozetkaOrder.created,
    updatedAt: rozetkaOrder.changed,
    deliveryPostNumber: rozetkaOrder.delivery?.place_number || null,
    notes: rozetkaOrder.comment || ''
  };
} 