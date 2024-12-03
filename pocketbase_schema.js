{
  "name": "orders",
  "type": "base",
  "schema": [
    {
      "id": "field_order_number",
      "name": "orderNumber",
      "type": "text",
      "required": true
    },
    {
      "id": "field_source",
      "name": "source",
      "type": "text",
      "required": true
    },
    {
      "id": "field_delivery_method",
      "name": "deliveryMethod",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "delivery_options"
      }
    },
    {
      "id": "field_delivery_post_number",
      "name": "deliveryPostNumber",
      "type": "text",
      "required": false
    },
    {
      "id": "field_phone_number",
      "name": "phoneNumber",
      "type": "text",
      "required": true
    },
    {
      "id": "field_full_name",
      "name": "fullName",
      "type": "text",
      "required": true
    },
    {
      "id": "field_products",
      "name": "products",
      "type": "json",
      "required": true
    },
    {
      "id": "field_number_of_items",
      "name": "numberOfItems",
      "type": "number",
      "required": true
    },
    {
      "id": "field_payment_method",
      "name": "paymentMethod",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "payment_options"
      }
    },
    {
      "id": "field_amount",
      "name": "amount",
      "type": "number",
      "required": true
    },
    {
      "id": "field_status",
      "name": "status",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "status_options"
      }
    },
    {
      "id": "field_currency",
      "name": "currency",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "currency_options"
      }
    },
    {
      "id": "field_notes",
      "name": "notes",
      "type": "editor",
      "required": false,
      "options": {
        "convertUrls": false
      }
    }
  ]
} 