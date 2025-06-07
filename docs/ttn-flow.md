# TTN Generation Flow

## Nova Poshta Flow

### 1. UI Flow

1. **Trigger Point**: Add a "Generate Nova Poshta Invoice" button in the OrderDetails component, which appears for orders with appropriate delivery methods (Nova Poshta)

2. **Invoice Creation Form**: When clicked, open a modal with a form containing fields needed for the Nova Poshta API:
   - Pre-filled fields from order data (customer name, phone, etc.)
   - Required REF selection fields:
     - City sender/recipient selectors (with search functionality)
     - Warehouse selectors (populated based on selected city)
     - Contact person selectors
   - Package details:    
     - Weight
     - Dimensions/Volume
     - Cargo type
     - Number of seats
     - Cost (pre-filled from order)
   - Payment details:
     - Payment method
     - Payer type (Sender/Recipient/ThirdPerson)

3. **REF Selection UI**:
   - City selector with search functionality (using `searchSettlements` API)
   - Street selector that updates based on selected city (using `searchSettlementStreets` API)
   - Address selection dropdown populated with results

### 2. Data Flow

1. **Data Collection**:
   - Use cached REF values where possible (stored in local state or context)
   - Progressive form filling (city → streets → addresses → warehouses)
   - Live validation of required fields

2. **API Integration**:
   - Create a Nova Poshta service in `app/services/novaPoshtaService.ts`
   - Implement methods for all required API calls:
     - `searchSettlements` - for city search
     - `searchSettlementStreets` - for street search
     - `getCounterpartyAddresses` - to load saved addresses
     - `getCounterpartyContactPersons` - to load contact persons
     - `save` in `InternetDocument` model - to create the invoice

3. **Invoice Creation**:
   - Submit collected data to Nova Poshta API
   - Store the returned TTN number in the order record (`ttnNumbers` field)
   - Update order status to reflect shipment creation

### 3. UI/UX Considerations

1. **Progressive Disclosure**:
   - Show only relevant fields based on selected options
   - Group related fields together (delivery address, package details, payment details)

2. **Loading States**:
   - Show loading indicators during API calls
   - Cache API responses to improve performance on subsequent uses

3. **Error Handling**:
   - Clear validation messages for form fields
   - Graceful error handling for API failures
   - Retry mechanisms for transient errors

4. **Saved Preferences**:
   - Store frequently used sender addresses and contact information
   - Remember last used values for quick re-use

### 4. Integration with Existing Workflow

1. **Order Status Updates**:
   - Update order status after successful invoice creation
   - Add tracking information to the order record

2. **Translation Integration**:
   - Add necessary translation keys in `messages/{locale}.json`
   - Use the `useTranslations` hook for all UI text

3. **Mobile Responsiveness**:
   - Ensure the form works well on mobile devices
   - Consider a step-based approach for mobile UIs

## UkrPoshta Flow

### 1. UI Flow

1. **Trigger Point**: Add a "Generate UkrPoshta Invoice" button in the OrderDetails component, which appears for orders with UkrPoshta delivery method

2. **Multi-Step Form Approach**: When clicked, open a modal with a step-based form:
   - **Step 1: Sender Details**
     - Create/select sender address
     - Create/select sender information (client)
   
   - **Step 2: Recipient Details**
     - Create/select recipient address
     - Create/select recipient information (client)
   
   - **Step 3: Shipment Details**
     - Delivery type selection (W2D, W2W, D2W, D2D)
     - Shipment type (EXPRESS, STANDARD, DOCUMENT, CARGO)
     - Package parameters (weight, dimensions)
     - Payment details (paidByRecipient, postPay)
     - Additional options (onFailReceiveType, description)
   
   - **Step 4: Confirmation**
     - Review all entered information
     - Display calculated shipping cost
     - Confirm shipment creation

3. **Address Selection UI**:
   - Form fields for all required address components (postcode, region, district, city, street, houseNumber, etc.)
   - Option to save/reuse addresses

### 2. Data Flow

1. **Address Creation**:
   - Create sender address using the Address API (POST to `/addresses`)
   - Create recipient address using the Address API
   - Store address IDs for client creation

2. **Client Creation**:
   - Create sender client using the Client API (POST to `/clients?token={token}`)
   - Create recipient client using the Client API
   - Store client UUIDs for shipment creation

3. **Shipment Creation**:
   - Create the shipment using the Postal Shipment API (POST to `/shipments?token={token}`)
   - Parameters include sender UUID, recipient UUID, delivery type, parcels information
   - Store returned shipment UUID and barcode

4. **Document Generation**:
   - Generate the shipping label using the supporting documentation API
   - Option to print form 103a for shipping manifests

### 3. API Integration

1. **Authentication Flow**:
   - Store and manage UkrPoshta API token
   - Add token to all API requests

2. **Service Implementation**:
   - Create UkrPoshta service in `app/services/ukrPoshtaService.ts`
   - Implement methods for all required API operations:
     - Address creation and management
     - Client creation and management
     - Shipment creation
     - Document generation

3. **Caching Strategy**:
   - Cache commonly used addresses and clients
   - Store user preferences for quick reuse

### 4. UI/UX Considerations

1. **Step-Based Approach**:
   - Break complex form into logical steps
   - Validate each step before proceeding
   - Allow navigation between steps

2. **Form Validation**:
   - Validate postal codes against UkrPoshta database
   - Ensure all required fields are filled correctly
   - Show validation errors inline

3. **Error Handling**:
   - Handle API errors gracefully
   - Provide clear error messages
   - Option to retry failed operations

4. **State Management**:
   - Preserve form state between steps
   - Allow saving draft shipments

### 5. Integration with Existing Workflow

1. **Order Status Updates**:
   - Update order status after successful shipment creation
   - Store shipment tracking information (barcode, UUID)

2. **Document Management**:
   - Option to download and print shipping labels
   - Store generated documents for later access

3. **Translation Integration**:
   - Add necessary translation keys for UkrPoshta-specific terms
   - Support both Ukrainian and English interfaces