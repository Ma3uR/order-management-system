# Rozetka TTN (Delivery Waybill) API Documentation

## Overview

This document describes the Rozetka API endpoint for creating delivery TTN (Transport Waybill Number) directly from an order.

## API Endpoint

**POST** `https://api-seller.rozetka.com.ua/delivery-rozetka/create-order-ttn`

**Permission**: `module_octopus`

## Authentication

**Header**: `Authorization: Bearer {token}`

The Bearer token is obtained from the `/sites` endpoint during Rozetka authentication.

## Request Headers

| Header | Type | Description |
|--------|------|-------------|
| Authorization | String | `Bearer {token}` |
| Content-Type | String | `application/json` |

## Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| order_id | Integer | ✅ Yes | ID замовлення (Order ID) |
| payer | String | ✅ Yes | Платник (Payer). Allowed: `"sender"` |
| places | Integer | ✅ Yes | Кількість транспортних місць (Number of packages). Allowed: `1` |
| params | Object | ✅ Yes | Габарити (Dimensions) - See RozetkaDeliveryParams |
| sender | Object | ✅ Yes | Відправник (Sender) - See RozetkaDeliverySender |
| description | String | ❌ No | Опис відправлення (Description, max 100 chars) |
| has_paid | Boolean | ❌ No | Чи оплачене замовлення (Is order fully paid). `true` = paid, `false` = COD expected |
| cost | Number | Conditional | Сума зворотної доставки (COD amount). Required if `has_paid=false`. Must be > 0 but ≤ order amount. If `has_paid=true`, then `cost=0` |
| carrier | Integer | ❌ No | ID перевізника (Carrier ID). Default: `1`. Allowed: `1` (ROZETKA Delivery), `4` (Meest) |
| registration_date | String | ❌ No | ISO date string |
| return_operations | String | ❌ No | Return operations description |
| departure_time | String | ❌ No | Departure time (e.g., "12:00") |

### RozetkaDeliveryParams Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| weight | Number | ✅ Yes | Вага (Weight in kg) |
| length | Number | ✅ Yes | Довжина (Length in cm) |
| width | Number | ✅ Yes | Ширина (Width in cm) |
| height | Number | ✅ Yes | Висота (Height in cm) |
| volume | Number | ✅ Yes | Об'єм (Volume in cubic meters) |

### RozetkaDeliverySender Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | String | ✅ Yes | Тип відправника. Allowed: `"legal"`, `"individual"` |
| city | String | ✅ Yes | Місто (City) |
| address | String | ✅ Yes | Адреса (Full address) |
| department | String | ✅ Yes | UUID відділення (Department UUID) |
| name | String | ✅ Yes | Назва відправника (Sender name/company) |
| phones | Array[String] | ✅ Yes | Телефони (Phone numbers) |
| info | String | ❌ No | Додаткова інформація (Additional info) |

## Request Example

```json
{
  "order_id": 35563694,
  "payer": "sender",
  "params": {
    "weight": 3.67,
    "length": 15,
    "width": 25.5,
    "height": 30,
    "volume": 2.869
  },
  "places": 1,
  "description": "заказ 23423-25673 включая новогодний подарок",
  "sender": {
    "type": "legal",
    "city": "Киев",
    "address": "г.Киев, ул. Кирпаноса 26",
    "department": "25029323-59b2-4726-8d23-85bd7ffb4b90",
    "name": "'ТОВ Контрагент'",
    "phones": ["+123456789012"],
    "info": "№4343 от 04.10.2019"
  },
  "registration_date": "2019-11-01T10:05:19.813Z",
  "return_operations": "сертификат оплаты №5553338888",
  "departure_time": "12:00",
  "has_paid": true,
  "cost": 0,
  "carrier": 1
}
```

## Success Response (200 OK)

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | ID ТТН (TTN ID in system) |
| ext_id | String | ID замовлення в сервісі доставки (External delivery service ID) |
| ttn | String | Номер ТТН (TTN number) |
| seller_id | Integer | ID продавця в системі Розетка (Seller ID) |
| order_id | Integer | ID замовлення (Order ID) |
| delivery_service_id | Integer | ID сервісу доставки (Delivery service ID) |
| delivery_service_pickup_id | Integer | ID точки доставки (Pickup point ID) |
| receiver_fio | String | ПІБ одержувача (Receiver name) |
| declared_price | Number | Заявлена вартість товару (Declared value) |
| status_updated_at | String | Дата оновлення статусу (Status update date) |
| delivery_price | Number | Вартість доставки (Delivery cost) |
| delivery_payer | Integer | Платник доставки: `0` = Sender, `1` = Receiver |
| payment_type | Integer | Тип платежу: `0` = Cash, `1` = Card |
| delivery_status_id | String | Id статусу доставки (Delivery status ID) |
| delivery_address | String | Адреса доставки (Delivery address) |
| delivery_type | Integer | Тип доставки: `0` = To department, `1` = To address |
| oriented_delivery_date | String | Орієнтовна дата доставки (Expected delivery date) |
| receiver_phone | String | Телефон одержувача (Receiver phone) |
| comment | String | Коментар до ТТН (Comment) |
| original_info | String | Данные по которым создавалась ТТН (Original creation data) |
| created_at | String | Дата створення ТТН (TTN creation date) |
| free_delivery | Boolean | Ознака акційного тарифу (Free delivery flag) |
| cod_amount | Integer | Сума зворотної доставки коштів (COD amount) |
| has_prepaid | Boolean | Чи оплачене замовлення повністю (Is prepaid) |
| is_carrier_meest | Boolean | Чи є перевізником Meest (Is Meest carrier) |
| carrier_track_num | String\|Null | ТТН перевізника (Carrier tracking number) |
| need_label | Boolean | Чи потрібні додаткові стікери (Need additional labels) |

### Success Response Example

```json
{
  "success": true,
  "content": {
    "ext_id": "UNK-400975992",
    "ttn": "UNK-400975992",
    "seller_id": 165,
    "order_id": "35563694",
    "delivery_service_id": 1,
    "delivery_status_id": "10010",
    "oriented_delivery_date": "2021-08-20 12:00:00",
    "status_updated_at": null,
    "receiver_fio": "'ТОВ Контрагент'",
    "receiver_phone": "380935215614",
    "delivery_address": "г.Южноукраинск, бульвар Цветочный 5",
    "declared_price": null,
    "delivery_price": 0,
    "delivery_payer": null,
    "payment_type": null,
    "delivery_service_pickup_id": null,
    "delivery_type": "door-door",
    "comment": "заказ 23423-25673 включая новогодний подарок",
    "cod_amount": 0,
    "original_info": null,
    "has_prepaid": true,
    "is_carrier_meest": false,
    "carrier_track_num": null,
    "created_at": "2021-08-25 15:44:16",
    "id": 313
  }
}
```

## Error Responses

### Internal Error

```json
{
  "success": false,
  "errors": {
    "message": "server_error",
    "code": 0
  }
}
```

### Access Denied

```json
{
  "success": false,
  "errors": {
    "message": "access_denied",
    "code": 403
  }
}
```

### Validation Error

```json
{
  "success": false,
  "errors": {
    "message": "validation_error",
    "fields": {
      "order_id": ["Order not found"],
      "cost": ["Cost is required when has_paid is false"]
    }
  }
}
```

## Implementation Notes

### Data Source Flow

1. **Recipient Data**: Taken from the order automatically by Rozetka API
2. **Payment Status**: Must be passed in `has_paid` parameter, or defaults to order payment status
3. **COD Amount**: Must be passed in `cost` parameter, or defaults to order amount
4. **Sender Data**: Must be provided in request (company/warehouse info)
5. **Package Dimensions**: Must be provided in request

### Business Logic

- If `has_paid=true` (order fully paid), then `cost=0`
- If `has_paid=false` (COD expected), then `cost > 0` and `cost ≤ order.amount`
- Default carrier is ROZETKA Delivery (carrier=1)
- Only one package is supported (places=1)
- Payer is always sender

### Storage

After successful TTN creation:
1. Store full response in order's `invoice_data` field
2. Store `ttn` value in order's `deliveryPostNumber` field
3. Update order status if needed

## Related Documentation

- [TTN Flow Architecture](./ttn-flow.md)
- [Nova Poshta TTN API](./nova-poshta-ttn-api.md) (for comparison)
