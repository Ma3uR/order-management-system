# Kasa.vchasno API Documentation

## Overview
Kasa.vchasno is a Ukrainian fiscal receipt system that provides API endpoints for generating fiscal receipts and managing cash register operations.

## Base URL
```
https://kasa.vchasno.ua/api/v3
```

## Authentication
All API requests require authentication via Authorization header:
```
Authorization: VCHASNO_KASA_PRRO_TOKEN
```

---

## Fiscal Receipt Execution

### Create Sale Receipt
Generates a fiscal receipt for a sale transaction.

**Endpoint:** `POST /fiscal/execute`

**Content-Type:** `application/json`

### Request Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | Yes | Source identifier (e.g., "POSTMAN") |
| `userinfo` | object | Yes* | User information (*required for sales, optional for returns) |
| `userinfo.email` | string | Yes* | User email address (*required for sales) |
| `userinfo.phone` | string | Yes* | User phone number (*required for sales) |
| `fiscal` | object | Yes | Fiscal data container |
| `fiscal.task` | number | Yes | Task type (1 = sale receipt, 2 = return receipt, 11 = Z-report) |
| `fiscal.cashier` | string | Yes | Cashier name |
| `fiscal.receipt` | object | Yes | Receipt details |

### Receipt Object Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sum` | number | Yes | Total receipt amount |
| `round` | number | No | Rounding amount |
| `comment_up` | string | No | Header comment on receipt |
| `comment_down` | string | No | Footer comment on receipt |
| `disc` | number | No | Total discount amount |
| `disc_type` | number | No | Discount type (0 = amount, 1 = percentage) |
| `rows` | array | Yes | Array of receipt items |
| `pays` | array | Yes | Array of payment methods |

### Receipt Row Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Product code |
| `name` | string | Yes | Product name |
| `cnt` | number | Yes | Quantity |
| `price` | number | Yes | Unit price |
| `disc` | number | No | Item discount (negative for markup) |
| `taxgrp` | string/number | Yes | Tax group |
| `pop` | string | No | Payment purpose |
| `code1` | string | No | Additional code 1 |
| `code2` | string | No | Additional code 2 |
| `code_a` | string | No | Additional code A |
| `code_aa` | array | No | Array of additional codes |
| `comment` | string | No | Item comment |

### Payment Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | number | Yes | Payment type (0 = cash, 1 = card, 2 = other) |
| `sum` | number | Yes | Payment amount |
| `change` | number | No | Change amount (for cash payments) |
| `commission` | number | No | Commission amount |
| `paysys` | string | No | Payment system identifier |
| `rrn` | string | No | Transaction reference number |
| `oper_type` | string | No | Operation type |
| `cardmask` | string | No | Masked card number |
| `term_id` | string | No | Terminal ID |
| `bank_name` | string | No | Bank name |
| `bank_id` | string | No | Bank ID |
| `auth_code` | string | No | Authorization code |
| `comment` | string | No | Payment comment |
| `show_additional_info` | boolean | No | Show additional payment info |

### Example Request

```bash
curl --location 'https://kasa.vchasno.ua/api/v3/fiscal/execute' \
--header 'Authorization: VCHASNO_KASA_PRRO_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
    "source": "POSTMAN",
    "userinfo": {
        "email": "test@vchasno.ua",
        "phone": "+38093*******"
    },
    "fiscal": {
        "task": 1,
        "cashier": "Постман",
        "receipt": {
            "sum": 199.99,
            "round": 0.01,
            "comment_up": "Зразок! Коментар шапки чеку",
            "comment_down": "Зразок! ДЯКУЄМО за покупку",
            "disc": 10.00,
            "disc_type": 0,
            "rows": [
                {
                    "code": "00001",
                    "pop": "Оплата за послуги користування ПРРО",
                    "code1": "73463253",
                    "code2": "54321",
                    "code_aa": [
                        "XX11111111111",
                        "XX11111111112"
                    ],
                    "name": "Продукт 1",
                    "cnt": 2,
                    "price": 55.00,
                    "disc": 10.00,
                    "taxgrp": "4",
                    "comment": "Зразок! Коментар"
                },
                {
                    "code": "00002",
                    "code1": "73463254",
                    "code2": "45667",
                    "code_a": "XX11111111113",
                    "name": "Продукт 2",
                    "cnt": 1,
                    "price": 89.99,
                    "disc": -10.00,
                    "taxgrp": 3,
                    "comment": "Зразок! \"Have a good day\""
                }
            ],
            "pays": [
                {
                    "type": 0,
                    "sum": 150.00,
                    "change": 50.00,
                    "comment": "Зразок! Тест"
                },
                {
                    "type": 2,
                    "sum": 40.00,
                    "commission": 1.00,
                    "paysys": "paysys_test",
                    "rrn": "rrn_test",
                    "oper_type": "Оплата",
                    "cardmask": "cardmask****test",
                    "term_id": "term_id",
                    "bank_name": "bank_name",
                    "bank_id": "bank_id",
                    "auth_code": "auth_code",
                    "comment": "Зразок! СЛАВА*УКРАЇНІ",
                    "show_additional_info": true
                }
            ]
        }
    }
}'
```

### Response Structure

| Field | Type | Description |
|-------|------|-------------|
| `task` | number | Task identifier |
| `type` | number | Response type |
| `ver` | number | API version |
| `source` | string | Request source |
| `device` | string | Device/fiscal number |
| `tag` | string | Transaction tag |
| `dt` | string | Date/time (YYYYMMDDHHMMSS) |
| `res` | number | Result code (0 = success) |
| `res_action` | number | Action result code |
| `errortxt` | string | Error message (if any) |
| `warnings` | array | Array of warnings |
| `info` | object | Receipt information |
| `error_extra` | object | Additional error information |

### Receipt Info Object

| Field | Type | Description |
|-------|------|-------------|
| `task` | number | Task identifier |
| `fisid` | string | Fiscal device ID |
| `dataid` | number | Data ID |
| `doccode` | string | Document code |
| `dt` | string | Date/time |
| `cashier` | string | Cashier name |
| `dtype` | number | Document type |
| `isprint` | number | Print flag |
| `isoffline` | boolean | Offline mode flag |
| `safe` | number | Cash register safe amount |
| `shift_link` | number | Shift link number |
| `docno` | number | Document number |
| `cancelid` | string | Cancellation ID |
| `qr` | string | QR code URL for receipt verification |
| `mac` | string | Message authentication code |

### Example Response

```json
{
  "task": 1,
  "type": 1,
  "ver": 6,
  "source": "POSTMAN",
  "device": "99997955555555",
  "tag": "ea1a404fcc8f48f3e1dea03fe1ad3cbd",
  "dt": "20241114121430",
  "res": 0,
  "res_action": 0,
  "errortxt": "",
  "warnings": [],
  "info": {
    "task": 1,
    "fisid": "99997955555555",
    "dataid": 152,
    "doccode": "TEST_7B_WSDzzmo9H7w",
    "dt": "20241114121430",
    "cashier": "Постман",
    "dtype": 0,
    "isprint": 0,
    "isoffline": false,
    "safe": 150,
    "shift_link": 37,
    "docno": 1,
    "cancelid": "TEST_7B_WSDzzmo9H7w",
    "qr": "https://kasa.vchasno.ua/c/TEST_7B_WSDzzmo9H7w?id=TEST_7B_WSDzzmo9H7w&date=20241114&time=12:14:30&fn=99997955555555&sm=189.99&mac=e8acd9a470a6b4258ec4df473bb2a121094543d48f611084f1bfb08cb712f2e8",
    "mac": "e8acd9a470a6b4258ec4df473bb2a121094543d48f611084f1bfb08cb712f2e8"
  },
  "error_extra": null
}
```

## Response Codes

| Code | Description |
|------|-------------|
| `0` | Success |
| `1` | General error |
| `2` | Authentication error |
| `3` | Invalid request format |
| `4` | Device offline |

## Payment Types

| Type | Description |
|------|-------------|
| `0` | Cash |
| `1` | Card |
| `2` | Other electronic payment |

## Tax Groups

| Group | Description |
|-------|-------------|
| `1` | VAT 20% |
| `2` | VAT 7% |
| `3` | VAT 0% |
| `4` | No VAT |

## Error Handling

All errors are returned in the `errortxt` field with appropriate HTTP status codes. Check the `res` field in the response:
- `res: 0` - Success
- `res: non-zero` - Error occurred

Additional error details may be provided in the `error_extra` object.

## Notes

- All monetary amounts should be provided with 2 decimal places
- Discounts can be negative values (indicating markup)
- The QR code in the response can be used for receipt verification
- Keep the `doccode` for future reference and potential cancellations

### Create Return Receipt
Generates a fiscal receipt for a return/refund transaction.

**Endpoint:** `POST /fiscal/execute`

**Content-Type:** `application/json`

#### Key Differences from Sale Receipt:
- `fiscal.task` must be set to `2` (instead of `1` for sales)
- No `userinfo` object required for returns
- Receipt structure remains the same as sale receipts

#### Example Request

```bash
curl --location 'https://kasa.vchasno.ua/api/v3/fiscal/execute' \
--header 'Authorization: VCHASNO_KASA_PRRO_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "source": "POSTMAN",
    "fiscal": {
        "task": 2,
        "cashier": "Постман",
        "receipt": {
            "sum": 199.99,
            "round": 0.01,
            "comment_up": "Зразок! Коментар шапки чеку",
            "comment_down": "Зразок! ДЯКУЄМО за повернення",
            "rows": [
                {
                    "code": "00001",
                    "code1": "73463253",
                    "code2": "54321",
                    "code_aa": [
                        "XX11111111111",
                        "XX11111111112"
                    ],
                    "name": "Продукт 1",
                    "cnt": 2,
                    "price": 55.00,
                    "disc": 10.00,
                    "taxgrp": "4",
                    "comment": "Зразок! Коментар"
                },
                {
                    "code": "00002",
                    "code1": "73463254",
                    "code2": "45667",
                    "code_a": "XX11111111113",
                    "name": "Продукт 2",
                    "cnt": 1,
                    "price": 89.99,
                    "disc": -10.00,
                    "taxgrp": 3,
                    "comment": "Зразок! \"Have a good day\""
                }
            ],
            "pays": [
                {
                    "type": 0,
                    "sum": 150.00,
                    "change": 50.00,
                    "comment": "Зразок! Тест"
                },
                {
                    "type": 2,
                    "sum": 50.00,
                    "commission": 1.00,
                    "paysys": "paysys_test",
                    "rrn": "rrn_test",
                    "oper_type": "Оплата",
                    "cardmask": "cardmask****test",
                    "term_id": "term_id",
                    "bank_id": "bank_id",
                    "auth_code": "auth_code",
                    "comment": "Зразок! СЛАВА*УКРАЇНІ",
                    "show_additional_info": true
                }
            ]
        }
    }
}'
```

#### Example Response

```json
{
  "task": 2,
  "type": 1,
  "ver": 6,
  "source": "POSTMAN",
  "device": "99997955555555",
  "tag": "6fd430b3685d1d445c8a611d61cdd54a",
  "dt": "20241114121508",
  "res": 0,
  "res_action": 0,
  "errortxt": "",
  "warnings": [],
  "info": {
    "task": 2,
    "fisid": "99997955555555",
    "dataid": 153,
    "doccode": "TEST_g8MjrMAN_X6lKA",
    "dt": "20241114121508",
    "cashier": "Постман",
    "dtype": 0,
    "isprint": 0,
    "isoffline": false,
    "safe": 0,
    "shift_link": 37,
    "docno": 1,
    "cancelid": "TEST_g8MjrMAN_X6lKA",
    "qr": "https://kasa.vchasno.ua/c/TEST_g8MjrMAN_X6lKA?id=TEST_g8MjrMAN_X6lKA&date=20241114&time=12:15:08&fn=99997955555555&sm=199.99&mac=975e62f6827b43fc88bc9997a6a36c68d95fb0cc8fea82d8ac89e9b75ac3050f",
    "mac": "975e62f6827b43fc88bc9997a6a36c68d95fb0cc8fea82d8ac89e9b75ac3050f"
  },
  "error_extra": null
}
```

### Create Z-Report (Close Shift)
Generates a Z-report to close the current working shift and provides detailed shift summary.

**Endpoint:** `POST /fiscal/execute`

**Content-Type:** `application/json`

#### Key Features:
- `fiscal.task` must be set to `11` for Z-report/shift closing
- No `userinfo` or `receipt` objects required
- Returns comprehensive shift statistics and summaries

#### Example Request

```bash
curl --location 'https://kasa.vchasno.ua/api/v3/fiscal/execute' \
--header 'Authorization: VCHASNO_KASA_PRRO_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "source": "POSTMAN",
    "fiscal": {
        "task": 11,
        "cashier": "Постман"
    }
}'
```

#### Example Response

```json
{
  "task": 11,
  "type": 1,
  "ver": 6,
  "source": "POSTMAN",
  "device": "99997655555555",
  "tag": "704e5fca77edf44d2ce8e379bdd68429",
  "dt": "20240131101319",
  "res": 0,
  "res_action": 0,
  "errortxt": "",
  "warnings": [],
  "info": {
    "task": 11,
    "fisid": "99997655555555",
    "dataid": 202,
    "doccode": "TEST_cTMHA3qiU6DDvA",
    "dt": "20240131101319",
    "cashier": "Постман",
    "dtype": 0,
    "isprint": 0,
    "isoffline": false,
    "safe": 400.5,
    "shift_link": 46,
    "docno": 46,
    "receipt": {
      "count_p": 1,
      "count_m": 1,
      "count_14": 1,
      "count_transfer": 0,
      "last_docno_p": 1,
      "last_docno_m": 1
    },
    "summary": {
      "base_p": 199.99,
      "base_m": 199.99,
      "taxex_p": 27.17,
      "taxex_m": 27.17,
      "disc_p": 0,
      "disc_m": 0
    },
    "taxes": [
      {
        "gr_code": 3,
        "base_sum_p": 99.99,
        "base_sum_m": 99.99,
        "base_tax_sum_p": 95.23,
        "base_tax_sum_m": 95.23,
        "base_ex_sum_p": 99.99,
        "base_ex_sum_m": 99.99,
        "tax_name": "ПДВ_Г",
        "tax_fname": "ПДВ 20% + акциз 5%",
        "tax_lit": "ГД",
        "tax_percent": 20,
        "tax_sum_p": 15.87,
        "tax_sum_m": 15.87,
        "ex_name": "Акцизний податок 5% Д",
        "ex_percent": 5,
        "ex_sum_p": 4.76,
        "ex_sum_m": 4.76
      },
      {
        "gr_code": 4,
        "base_sum_p": 100,
        "base_sum_m": 100,
        "base_tax_sum_p": 100,
        "base_tax_sum_m": 100,
        "base_ex_sum_p": 0,
        "base_ex_sum_m": 0,
        "tax_name": "ПДВ_В",
        "tax_fname": "ПДВ 7%",
        "tax_lit": "В",
        "tax_percent": 7,
        "tax_sum_p": 6.54,
        "tax_sum_m": 6.54,
        "ex_name": "",
        "ex_percent": 0,
        "ex_sum_p": 0,
        "ex_sum_m": 0
      }
    ],
    "pays": [
      {
        "type": 0,
        "name": "Готівка",
        "sum_p": 150,
        "sum_m": 150,
        "round_pu": 0.01,
        "round_pd": 0,
        "round_mu": 0.01,
        "round_md": 0
      },
      {
        "type": 2,
        "name": "Картка",
        "sum_p": 50,
        "sum_m": 50,
        "round_pu": 0,
        "round_pd": 0,
        "round_mu": 0,
        "round_md": 0
      }
    ],
    "money": [
      {
        "type": 0,
        "name": "Готівка",
        "sum_p": 1001,
        "sum_m": 500.5,
        "round_pu": 0,
        "round_pd": 0,
        "round_mu": 0,
        "round_md": 0
      }
    ],
    "cash": [
      {
        "type": 2,
        "name": "Картка",
        "sum_p": 0,
        "sum_m": 100,
        "round_pu": 0,
        "round_pd": 0,
        "round_mu": 1.01,
        "round_md": 0
      }
    ],
    "money_transfer": []
  },
  "error_extra": null
}
```

#### Z-Report Response Structure

**Receipt Counters (`info.receipt`)**
| Field | Type | Description |
|-------|------|-------------|
| `count_p` | number | Count of positive (sale) receipts |
| `count_m` | number | Count of negative (return) receipts |
| `count_14` | number | Count of service receipts |
| `count_transfer` | number | Count of transfer operations |
| `last_docno_p` | number | Last document number for sales |
| `last_docno_m` | number | Last document number for returns |

**Shift Summary (`info.summary`)**
| Field | Type | Description |
|-------|------|-------------|
| `base_p` | number | Total base amount for sales |
| `base_m` | number | Total base amount for returns |
| `taxex_p` | number | Total tax and excise for sales |
| `taxex_m` | number | Total tax and excise for returns |
| `disc_p` | number | Total discounts for sales |
| `disc_m` | number | Total discounts for returns |

**Tax Details (`info.taxes[]`)**
| Field | Type | Description |
|-------|------|-------------|
| `gr_code` | number | Tax group code |
| `base_sum_p/m` | number | Base sum for sales/returns |
| `base_tax_sum_p/m` | number | Taxable base for sales/returns |
| `base_ex_sum_p/m` | number | Excise base for sales/returns |
| `tax_name` | string | Tax name |
| `tax_fname` | string | Full tax name |
| `tax_lit` | string | Tax letter designation |
| `tax_percent` | number | Tax percentage |
| `tax_sum_p/m` | number | Tax amount for sales/returns |
| `ex_name` | string | Excise tax name |
| `ex_percent` | number | Excise percentage |
| `ex_sum_p/m` | number | Excise amount for sales/returns |

**Payment Methods (`info.pays[]`)**
| Field | Type | Description |
|-------|------|-------------|
| `type` | number | Payment type (0=cash, 2=card) |
| `name` | string | Payment method name |
| `sum_p/m` | number | Total amount for sales/returns |
| `round_pu/pd` | number | Rounding up/down for sales |
| `round_mu/md` | number | Rounding up/down for returns |

## Task Types

| Task | Description |
|------|-------------|
| `1` | Sale receipt |
| `2` | Return receipt |
| `11` | Z-report (Close shift) |
