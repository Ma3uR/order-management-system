# UkrPoshta API Logic

## 1. Overview

To create a shipment in the UkrPoshta system, follow these steps:
1. Create a sender address
2. Create a recipient address
3. Add sender information (create a sender client)
4. Add recipient information (create a recipient client)
5. Create the shipment
6. Generate and print the label

## 2. Address API

### Description
The address is used when creating clients, shipments, etc. Each created address is assigned a unique ID.

**URI:** `/addresses`  
**Methods:** GET, POST

### JSON Body Parameters

| Parameter | Type | Description | Required | Used in Request |
|-----------|------|-------------|----------|----------------|
| postcode | String | Postal code (digits only, 5 characters). Validated against database when creating an address. | Yes | Yes |
| region | String | Region name (max 45 characters) | No | Yes |
| district | String | District name (max 45 characters) | No | Yes |
| city | String | Settlement name (max 45 characters) | No | Yes |
| street | String | Street name (max 255 characters) | No | Yes |
| houseNumber | String | House number (max 15 characters) | No | Yes |
| apartmentNumber | String | Apartment number (max 15 characters) | No | Yes |
| description | String | Description or comments (max 255 characters) | No | Yes |
| specialDestination | String | Special purpose address, military unit or place of imprisonment (max 255 characters). If this field is filled in the recipient's client address, shipment can only be created with type STANDARD or DOCUMENT. COD and recipient payment are not possible. | No | Yes |
| mailbox | String | Mailbox number. Used for sending to/from mailbox. If mailbox is specified, fields street, houseNumber, apartmentNumber, foreignStreetHouseApartment, specialDestination must remain empty (null). For addresses with mailbox field, it's not possible to create shipments with door delivery (..2D). | No | Yes |
| lift | Boolean | Presence of a working elevator to ascend to the floor. Default false - elevator is absent. If floor ascent is required when creating a shipment, the lift field is mandatory. | No | Yes |
| floor | Number | Floor of the building for shipment ascent. No more than 2 characters (up to 57). If not specified - 0. If floor ascent is required when creating a shipment, the floor field is mandatory. | No | Yes |
| created | String (LocalDateTime) | Date and time the address was created | No | No |
| lastModified | String (LocalDateTime) | Date and time the address was last modified | No | No |
| foreignStreetHouseApartment | String | House number. Used for international shipments. | No | No |
| id | Number (long) | Unique address identifier, assigned automatically upon creation. | No | No |
| country | String | Country, default UA | No | No |
| detailedInfo | String | Address parts, assembled in a string separated by commas. | No | No |
| countryside | Boolean | Rural area designation (true/false). Used for tariff calculation, assigned automatically based on postal code. | No | No |

### Creating an Address

**POST Request**
```
URI: /addresses
{
  "postcode":"07401",
  "country":"UA",
  "region":"Київська",
  "city":"Бровари",
  "district":"Київський",
  "street":"Котляревського",
  "houseNumber":"12",
  "apartmentNumber":"33"
}
```

**Response**
```
Code: 200
{
  "id":530887,
  "postcode":"04071",
  "region":"Kyiv",
  "district":null,
  "city":"Kyiv",
  "street":"Khoriva",
  "houseNumber":"40",
  "apartmentNumber":"20",
  "mailbox":"none",
  "description":"none",
  "countryside":false,
  "foreignStreetHouseApartment":null,
  "detailedInfo":"Україна, 04071, Kyiv, Kyiv, Khoriva 40, 20, none",
  "created":"2018-12-05T13:59:06",
  "lastModified":"2018-12-05T13:59:06",
  "country":"UA"
}
```

### Retrieving a Created Address

**Parameters in the Request**
`{id}` – ID of the created address

**GET Request**
```
URI: /addresses/{id}
```

**Response**
```
Code: 200
{
  "id":530887,
  "postcode":"04071",
  "region":"Kyiv",
  "district":null,
  "city":"Kyiv",
  "street":"Khoriva",
  "houseNumber":"40",
  "apartmentNumber":"20",
  "mailbox":"none",
  "description":"none",
  "countryside":false,
  "foreignStreetHouseApartment":null,
  "detailedInfo":"Україна, 04071, Kyiv, Kyiv, Khoriva 40, 20, none",
  "created":"2018-12-05T13:59:06",
  "lastModified":"2018-12-05T13:59:06",
  "country":"UA"
}
```

### Checking Delivery Route Availability Between Postal Codes

**GET Request**
```
URI: /addresses/availability-checking/from/{senderPostcode}/to/{recipientPostcode}
```

**Response**
```
Code: 200
{
  "code": "SUCCESS",
  "description": "Вдало. Маршрут між індексами доступний.",
  "mrtps": "1",
}
```

The `mrtps` field represents the location of the mobile office. It can have values from 1 to 9:
1: Absent
2: In village council premises
3: In former post office premises
4: In house of culture
5: In library
6: In store
7: At gas station
8: In sorting center
9: Other

### Updating Address Description by ID

**PUT Request**
```
URI: /addresses/description/{addressId}
{
  "description":"Оновлена адреса"
}
```

**Response**
```
Code: 200
{
  "id":530887,
  "postcode":"04071",
  "region":"Kyiv",
  "district":null,
  "city":"Kyiv",
  "street":"Khoriva",
  "houseNumber":"40",
  "apartmentNumber":"20",
  "description":"Оновлена адреса",
  "countryside":false,
  "foreignStreetHouseApartment":null,
  "detailedInfo":"Україна, 04071, Kyiv, Kyiv, Khoriva 40, 20, none",
  "created":"2018-12-05T13:59:06",
  "lastModified":"2018-12-05T13:59:06",
  "country":"UA"
}
```

## 3. Client API

### Description
The client is used in postal shipments as a sender and recipient. A counterparty can create any number of clients. For client operations, the user token is used: `/clients?token={token}`.

If the client is an individual or private entrepreneur, you must specify the client's first name, last name, and patronymic (parameters firstName, lastName, and middleName, respectively). The name parameter is generated automatically. If the client is a legal entity, only the name parameter needs to be specified.

**URI:** `/clients`  
**Methods:** GET, POST, PUT

### JSON Body Parameters

| Parameter | Type | Description | Required | Used in Request |
|-----------|------|-------------|----------|----------------|
| name | String | Client name (2-60 characters, mandatory for legal entities and private entrepreneurs. For individuals, formed from parameters: firstName, middleName, lastName) | Yes | Yes |
| firstName | String | Individual's first name (2-250 characters) | Yes | Yes |
| lastName | String | Individual's last name (2-250 characters) | Yes | Yes |
| addressId | Number (long) | Address identifier, specified by the ID of a previously created address | Yes | Yes |
| edrpou* | String | EDRPOU of legal entity (digits only, 5-8 characters). API allows saving only valid EDRPOU. Validation is performed according to the algorithm. | Yes for COMPANY | Yes |
| tin* | String | Individual tax number for individuals and private entrepreneurs (digits only, 10 characters). API allows saving only valid TIN. Validation is performed according to the algorithm. | Yes for PRIVATE_ENTREPRENEUR | Yes |
| phoneNumber | String | Client's phone number (digits only, max 25 characters). For Document type shipments, if the address specifies a PO box, phone can be omitted. If the address specifies an office without a PO box, mobile number must be specified. | Yes (for Standard and Express) | Yes |
| latinName | String | Client name in Latin characters (for international shipments) | No | Yes |
| type | String (Enum) | Client type: INDIVIDUAL - individual, COMPANY - legal entity, PRIVATE_ENTREPRENEUR - private entrepreneur. Default is COMPANY. Client type cannot be changed. | No | Yes |
| middleName | String | Individual's patronymic (2-250 characters). If the sender is an individual, for shipments with COD, this field is mandatory. | No | Yes |
| uniqueRegistrationNumber | String | Unique registration number | No | Yes |
| addresses | Array (List) | Client addresses. Has the following fields: uuid - unique identifier of the client's created address; addressId - address identifier; address - address object in the created client; type - address type (PHYSICAL - physical or LEGAL - legal); main - designation of the client's main address. A client can have only one main address. | No | Yes |
| phones | Array (List) | Client phone numbers. Has the following fields: uuid - unique identifier of the phone number of the created client; phoneId - client's phone number identifier; phoneNumber - phone number; type - client's phone number type (WORK - work or PERSONAL - personal); main - designation of the client's main phone number. A client can have only one main number; isConfirmed - phone number confirmed. | No | Yes |
| bankAccount | String | Settlement account in international format - IBAN, 29 characters | No | Yes |
| email | String | Client's email | No | Yes |
| emails | Array (List) | Client's email addresses. Has the following fields: uuid - unique identifier of the email of the created client; email - email; main - designation of the client's main email address. A client can have only one main email address. | No | Yes |
| externalId | String | External client identifier in the counterparty's database | No | Yes |
| contactPersonName | String | Name of contact person. If the field is not filled, the name of the sender or recipient is displayed on the label, respectively. | No | Yes |
| resident | Boolean | Resident of Ukraine. If resident is true, the client is a resident of Ukraine. When creating a client, the resident field defaults to true. | No | Yes |

### Creating a Client

**POST Request**
```
URI: /clients?token={token}
(Legal entity)
{
  "type":"COMPANY",
  "name":"ТОВ Лімон Банк",
  "uniqueRegistrationNumber":"0035",
  "addressId":"{addressId}",
  "phoneNumber":"0671231234",
  "email":"test@test.com",
  "bankAccount":"UA073808050000000026000439806",
  "resident":true,
  "edrpou":"40145721"
}
```

**Response**
```
Code: 200
{
  "uuid":"2e88b642-06ab-44e5-9a28-7acab533ed88",
  "name":"ТОВ Лімон Банк",
  "firstName":null,
  "middleName":null,
  "lastName":null,
  "latinName":null,
  "postId":null,
  "externalId":null,
  "uniqueRegistrationNumber":"0035",
  "counterpartyUuid":"b17859c4-7fae-46b1-9243-31985df82fd9",
  "addressId":7435476,
  "addresses":[
    {
      "uuid":"4a16add9-a2de-45a3-adc0-512a076006c9",
      "addressId":7435476,
      "address":{
        "id":7435476,
        "postcode":"04071",
        "region":"Київ",
        "district":"Подільський",
        "city":"Київ",
        "street":"Хорива",
        "houseNumber":"40",
        "apartmentNumber":"20",
        "description":"none",
        "countryside":false,
        "foreignStreetHouseApartment":null,
        "detailedInfo":"Україна, 04071, Київ, Подільський, Київ, Хорива 40, 20, none",
        "created":"2019-08-07T09:37:56",
        "lastModified":"2019-08-07T09:37:56",
        "country":"UA"
      },
      "type":"PHYSICAL",
      "main":true
    }
  ],
  "phoneNumber":"+380671231234",
  "phones":[
    {
      "uuid":"957f83be-666b-4c88-bbc3-b6dfbced3a89",
      "phoneId":24645,
      "phoneNumber":"+380671231234",
      "type":"PERSONAL",
      "main":true
    }
  ],
  "email":"test@test.com",
  "emails":[
    {
      "uuid":"0b92770a-4186-4b99-ad5f-21570f207410",
      "email":"test@test.com",
      "main":true
    }
  ],
  "type":"COMPANY",
  "postPayPaymentType":"POSTPAY_PAYMENT_CASH_ONLY",
  "edrpou":"40145721",
  "bankAccount":"UA073808050000000026000439806"
}
```

## 4. Postal Shipment API

### Description
Creating a postal shipment is the main business process of this API. The postal shipment accepts the counterparty's authentication token as a query parameter for any operations. For operations with shipments, the user token is used: `/shipments?token={token}`. The sender and recipient are specified in the form of embedded JSON when creating a postal shipment. When creating a shipment, the sender can specify additional recipient data used in printed forms. Postal shipments with Standard and Express types can contain several parcels, but their total weight should not exceed 1000 kg. Shipment parameters are filled based on the package (weight, length, etc.). The delivery amount is calculated when creating the postal shipment and is displayed in the response body as the "deliveryPrice" parameter.

**URI:** `/shipments`  
**Methods:** GET, POST, PUT

### JSON Body Parameters

| Parameter | Type | Description | Required | Used in Request |
|-----------|------|-------------|----------|----------------|
| sender | String | Sender information can be specified by passing the sender's uuid (see minimal request example). If the sender is a legal entity or private entrepreneur, the tin or edrpou field must be filled. The sender must have a phone number specified. | Yes | Yes |
| recipient | String | Recipient information can be specified by passing their uuid (see minimal request example). | Yes | Yes |
| deliveryType | String | Delivery type (4 main types: W2D office-door, W2W office-office, D2W door-office, D2D door-door) (for Ukrposhta STANDARD (type: STANDARD) only with declared value). | Yes | Yes |
| parcels | Array (Set) | Shipment parameters (parcels for multi-parcel shipments). Note that Document type shipments can have only one parcel. | Yes | Yes |
| type | String | Postal shipment type: EXPRESS - Express; STANDARD - Standard; DOСUMENT - Documents; CARGO - large-sized shipment, cargo (Shipment B). Default is EXPRESS. | No | Yes |
| senderAddressId | Number (Long) | Sender address identifier. Can only specify an id from the client's address list. | No | Yes |
| recipientPhone | String | Additional recipient phone number (if specified) becomes the main one and is displayed in documents. The recipientPhone value must match one of the recipient's phones. | No | Yes |
| recipientEmail | String | Additional email address | No | Yes |
| recipientAddressId | String | Recipient address identifier. Can only specify an address that is filled in the client's body. If an address is specified, it will be used for shipment calculation. The recipientAddressId parameter must match the recipient's addressId. | No | Yes |
| returnAddressId | String | For shipment return, you can specify an address that differs from the sender's address. In returnAddressId, you can only specify an id from the sender's address list. If returnAddressId does not specify an address, the sender's address is used. | No | Yes |
| onFailReceiveType | String | Actions with the shipment if the recipient does not pick it up. If not otherwise specified, RETURN is set by default. | No | Yes |
| postPay | Number (BigDecimal) | COD in hryvnias, cannot be higher than the declared price. Document type shipments cannot have COD. For individual senders, full name must be specified to receive COD. | No | Yes |
| description | String | Description or comments (255 characters). The description is displayed on the label, which may cause restrictions on the description length. | No | Yes |
| paidByRecipient | Boolean | Payment for shipment shipping upon receipt. True - payment by recipient. False - payment by sender. For loyalty program shipments - true. Default is false. (For Ukrposhta STANDARD only with declared value) | No | Yes |

### Creating a Shipment

**POST Request**
```
URI: /shipments?token={token}
{
  "sender":{
    "uuid":"{SenderUuid}"
  },
  "recipient":{
    "uuid":"{RecipientUuid1}"
  },
  "deliveryType":"W2D",
  "paidByRecipient":true,
  "parcels":[
    {
      "weight":1200,
      "length":170,
      "height": 10,
      "width": 10
    }
  ]
}
```

**Response**
```
Code: 200
{
  "uuid":"9d6285f1-1693-4ea0-8c55-29e13ca8eed2",
  "type":"EXPRESS",
  "sender":{
    "uuid":"3b699af0-276b-4c94-8bef-2bb63a01099f",
    "name":"ФОП Петренко",
    ...
  },
  "dropOffPostcode":"04071",
  "recipient":{
    "uuid":"b533c4a3-e483-4e73-b13b-dbaa53d7e180",
    "name":"Іванов Іван Іванович",
    ...
  },
  "recipientPhone":"+380982004113",
  "recipientEmail":"test@test.com",
  "recipientAddressId":515834,
  "senderAddressId":515862,
  "returnAddressId":515862,
  "shipmentGroupUuid":null,
  "externalId":null,
  "deliveryType":"W2D",
  "packageType":null,
  "onFailReceiveType":"RETURN",
  "barcode":"5551400000659",
  "weight":1200,
  "length":170,
  "width":10,
  "height":10,
  "declaredPrice":null,
  "deliveryPrice":342,
  "rawDeliveryPrice":360,
  "returnDeliveryPrice": 171,
  ...
}
```

### Getting a Specific Set of Shipment Data by UUID or Barcode

**Parameters in the Request**
`{shipmentUuidOrBarcode}` – uuid or barcode of the shipment

**POST Request**
```
URI: /shipments/{shipmentUuidOrBarcode}?token={token}
```

## 10. Supporting Documentation

To get supporting documents, use the GET method.
For printing labels and form 103a, a separate service is used, so access to the service is via a separate URI:
`{formUrl} = https://www.ukrposhta.ua/forms/ecom/0.0.1/`

You can download the label as a pdf file using the standard curl parameter for writing the response to a file -o (-output), which needs to be passed in the request.

### Address Label

Address label 100*100 mm can be obtained at:
```
{formUrl}/shipments/{shipment_uuid or barcode}/sticker?token={token}
```

Address label 100*100 mm for printing on A4 format can be obtained at:
```
{formUrl}/shipments/{shipment_uuid or barcode}/sticker?token={token}&size=SIZE_A4
```

Address label 100*100 mm for printing on A5 format can be obtained at:
```
{formUrl}/shipments/{shipment_uuid or barcode}/sticker?token={token}&size=SIZE_A5
```

Address label 100*100 mm for shipment groups:
```
{formUrl}/shipment-groups/{shipment_group_uuid}/sticker?token={token}
```

Address label 100*100 mm for printing on A4 format, for shipment groups:
```
{formUrl}/shipmentgroups/{shipment_group_uuid}/sticker?token={token}&size=SIZE_A4
```

Address label of a multi-parcel shipment by parcel barcode:
```
{formUrl}/shipments/sticker/parcel/{parcelBarcode}?token={token}
```

### Printing Labels by Barcode List (Without Group)

**POST Request**
```
URI: /shipments/stickers-by-barcodes?token={token}&size={formSize}
{
  "0500101983180": {},
  "0500101984900": {},
  "e7f8c413-2bfb-4a1b-8f73-bfb69bcce246": {}
}
```

**Response**
```
Code: 200 -------------------------------------- pdf-file---------------------------------
```

In the request body, you can pass both uuid and shipment barcode.
For each shipment in braces {}, you can specify the following additional parameters:
- hideWeight
- hidePostpayDeliveryPrice
- hideDeliveryPrice

Values for parameters: "1" - apply, "0" - do not apply (default).

### Form 103

Form 103a for a group of postal shipments:
```
{formUrl}/shipment-groups/{shipment_group_uuid}/form103a?token={token}
```

To display the sender's name at the end of the request, add `&showSenderName=true`

To not display the declared value on the printed form, add `&hideDeclaredPrice=1` at the end of the request

### Form 119

Form 119 (delivery notification) by shipment uuid or barcode:
```
{formUrl}/shipments/{uuidOrBarcode}/form119?token={token}
```

Form 119 (delivery notification) by delivery notification uuid or barcode:
```
{formUrl}/shipments/delivery-notifications/{uuidOrBarcode}/form119?token={token}
```

Form 119 (delivery notification) by shipment group uuid:
```
{formUrl}/shipment-groups/{uuid}/form119?token={token}
```

### Document Return Delivery

Address label of the return shipment for document delivery by return shipment uuid or barcode:
```
{formUrl}/document-back/{docBackShipmentUuid}/sticker?token={token}
```

Address label of the return shipment for document delivery by direct shipment uuid or barcode:
```
{formUrl}/documentback/by/shipment/{shipmentForDocBackUuid}/sticker?token={token}
```

Address labels of the return shipment for document delivery by group uuid:
```
{formUrl}/shipment-groups/{shipmentGroupUuid}/documentback/sticker?token={token}
```

Address label of direct and return shipment by direct shipment barcode or uuid:
```
{formUrl}/shipments/{uuidOrBarcode}/with-document-back/sticker?token={token}
```

Address label of direct and return shipment by return shipment barcode or uuid:
```
{formUrl}/document-back/{uuidOrBarcode}/with-shipment/sticker?token={token}
```

Address label of direct and return shipment by shipment group uuid:
```
{formUrl}/shipment-groups/{uuid}/shipment-with-document-back/sticker?token={token}
```

### Form 107

Form 107 by shipment uuid or barcode:
```
{formUrl}/shipments/{uuidOrBarcode}/form107?token={token}
```

Form 107 by shipment group uuid:
```
{formUrl}/shipment-groups/{uuid}/form107?token={token}
```
