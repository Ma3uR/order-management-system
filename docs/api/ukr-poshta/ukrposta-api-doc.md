# Ukrpost API Developer Integration Guide

**Ukraine's national postal service API provides comprehensive e-commerce integration** with robust shipment management, tracking, and address validation capabilities. However, full API access requires formal business contracts, making third-party integrations a viable alternative for many developers.

## Overview and purpose

The Ukrpost API serves as the technical backbone for integrating with Ukraine's national postal service, supporting over 11,000 delivery points nationwide. The API is **specifically designed for e-commerce businesses** seeking automated shipping solutions with competitive pricing—offering rates up to 30% below market average and a 10% discount for API-created shipments.

The system handles both domestic and international shipping with comprehensive features including real-time tracking, automated cost calculation, document generation, and multi-language support. Unlike consumer-focused tracking services, this API is built for **business-to-business integration** requiring contractual partnerships.

## Authentication requirements and access

Ukrpost implements a **dual-token authentication system** that requires formal business partnerships:

**Authentication Structure:**
- **Bearer Token**: Primary authentication credential
- **Token Key**: Secondary token for specific API sub-portals  
- **Sub-portal Separation**: Each service (eCom, StatusTracking, AddressClassifier) requires separate credentials

**Access Requirements:**
- Formal contract signing with Ukrpost regional managers
- Business partnership agreement mandatory
- Credentials issued only after contract execution
- No public API keys or sandbox environment available

**Developer Portal:** `dev.ukrposhta.ua` (Ukrainian language, authentication required)

## API endpoints and methods

The API is organized into **five core service categories** with RESTful design patterns:

### Address management
- **POST** `modelAdressPost()` - Create new address
- **PUT** `editAddress()` - Update existing address  
- **GET** `getAddress()` - Retrieve address by ID

### Client and counterparty management  
- **POST** `createClient()` - Create new client/counterparty
- **PUT** `editClient()` - Update client information
- **GET** `clientsList()` - List all clients
- **GET** `getClient()` - Get specific client details

### Shipment operations
- **POST** `modelShipmentsPost()` - Create new shipment
- **PUT** `editParcel()` - Modify existing parcel
- **GET** `parcelList()` - List parcels  
- **GET** `getParcel()` - Get parcel details
- **DELETE** `delParcelGroup()` - Remove parcel from group

### Group management and batch operations
- **POST** `createGroup()` - Create shipment groups
- **GET** `groupList()` - List shipment groups
- **PUT** `editGroup()` - Update group information

### Document services and tracking
- **POST** `createForm()` - Generate PDF shipping forms
- **POST** `createForm103()` - Generate Form 103 documents
- **GET** `modelStatuses()` - Track package status
- **GET** `requestBarcodeLastStatus()` - Get latest tracking status
- **GET** `requestBarcodeStatuses()` - Get complete tracking history

## Request and response formats

All API communication uses **JSON format** with comprehensive data structures:

### Standard address request structure
```json
{
  "postcode": "07401",
  "country": "UA", 
  "region": "Київська",
  "city": "Бровари",
  "district": "Київський",
  "street": "Котляревського",
  "houseNumber": "12",
  "apartmentNumber": "33"
}
```

### Shipment creation request
```json
{
  "sender": {
    "uuid": "{SenderUuid}"
  },
  "recipient": {
    "uuid": "{RecipientUuid}"  
  },
  "deliveryType": "W2D",
  "paidByRecipient": true,
  "nonCashPayment": false,
  "parcels": {
    "weight": 1200,
    "length": 170
  }
}
```

### Typical API response
```json
{
  "id": 123130,
  "postcode": "02099", 
  "region": "Полтавська",
  "city": "Полтава",
  "street": "Шевченка",
  "houseNumber": "51",
  "detailedInfo": "Україна, 02099, Полтавська, Полтавський, Полтава, Шевченка, 51, 20",
  "country": "UA"
}
```

## Key parameters and delivery options

### Delivery type codes and service levels
- **W2D** - Warehouse to Door (Express courier service)
- **W2W** - Warehouse to Warehouse (Standard branch pickup)
- **Standard Courier** - Regular courier delivery
- **Express to Branch** - Fast delivery to pickup point

### Critical parameters for shipment creation
- **weight**: Parcel weight in grams (supports 250g+ packages)
- **length/width/height**: Dimensions in centimeters (actual weight only, no volumetric calculation)
- **deliveryType**: Service level selection
- **paidByRecipient**: Payment responsibility
- **counterpartyUuid**: Business entity identifier

**Address validation** requires all standard Ukrainian postal address components including region, district, city, street, and postal code.

## Rate limits and usage restrictions

### Performance specifications and limitations
- **Response Timeout**: 30 seconds maximum
- **Bulk Tracking**: Up to 30 tracking numbers per request
- **Tracking Format**: 13-character alphanumeric codes
- **API Rate Limits**: Not publicly documented (requires contract review)

### Service boundaries and considerations
- **Data Isolation**: API-created shipments remain separate from personal cabinet data
- **Weight Support**: Specialized handling for packages over 250 grams
- **Geographic Coverage**: 11,000+ delivery points across Ukraine
- **Pricing Benefits**: 10% discount for API-created shipments, up to 30% below market rates

## Example implementation and SDKs

### Official PHP SDK usage
```php
use Ukrposhta\Tracking\Tracking;

$tracking = (new Tracking())
    ->setAccessToken('[BEARER-STATUS-TRACKING-ACCESS-TOKEN]')
    ->setRequestLang('EN')
    ->requestBarcodeLastStatus('[BARCODE]');

echo $tracking->getEventName();
```

### Community library example
```php
use Ukrpochta\Pochta;

$ukrpochta = new Pochta('API_KEY');
$result = $ukrpochta->editAddress(123130, array(
    'postcode' => '02099',
    'region' => 'Полтавська',
    'city' => 'Полтава',
    'street' => 'Шевченка',
    'houseNumber' => '25'
));
```

### Available development libraries
- **PHP SDK**: `tibezh/ukrposhta-php-sdk` (Official, PHP 8.1+)
- **Go Package**: `dennwc/ukrpost` (Community-maintained)
- **Python Library**: Multiple community forks available
- **OpenCart Modules**: Full e-commerce platform integration

## Alternative integration approaches

### Third-party API services for immediate access
When direct API access isn't feasible, several established services provide **normalized Ukrpost integration**:

- **AfterShip API**: Enterprise tracking solution with 1,100+ carrier support
- **Track123**: Multi-carrier tracking with standardized responses  
- **EasyPost**: Comprehensive shipping API including Ukrpost support
- **17TRACK**: Consumer and business tracking services

### Third-party integration example
```bash
curl --request POST \
  --url https://api.aftership.com/tracking/2024-04/trackings \
  --header 'Content-Type: application/json' \
  --data '{"tracking":{"slug":"ukrposhta","tracking_number":"123456789"}}'
```

## Notable features and technical limitations

### Advanced capabilities and automation features  
- **Automatic Cost Calculation**: Real-time pricing based on delivery type, addresses, weight, and dimensions
- **Document Generation**: PDF forms with unique barcode identifiers (ShKI)
- **Multi-language Support**: Ukrainian and English interface options
- **SMS/Email Notifications**: Automated tracking updates and delivery confirmations
- **Order Status Integration**: Automatic e-commerce platform status updates

### Key limitations for developers
- **No Public Sandbox**: Testing requires live credentials and contracts
- **Regional Manager Dependency**: Human approval process for all API access
- **Limited Documentation**: Public technical documentation restricted without authentication
- **Data Separation**: API shipments don't appear in personal account interfaces
- **Contract Requirement**: No trial or development-only access available

## Conclusion

The Ukrpost API offers **robust e-commerce shipping capabilities** with competitive pricing and comprehensive automation features. However, the mandatory business contract requirement makes it primarily suitable for established businesses with significant shipping volumes.  

**For immediate development needs**, third-party services like AfterShip provide normalized access to Ukrpost tracking and shipping capabilities without contractual obligations. **For serious e-commerce integration** in the Ukrainian market, the investment in official API access provides significant cost savings and automation benefits that justify the partnership requirements.