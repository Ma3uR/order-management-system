# Casa.vchasno Integration Setup Guide

## Overview

This guide will help you set up the casa.vchasno fiscal receipt integration for your order management system.

## Prerequisites

1. Casa.vchasno account and API access
2. Valid Casa.vchasno API token
3. PocketBase database access
4. Node.js environment

## 1. Environment Variables

Add the following environment variable to your `.env` file:

```bash
CASA_VCHASNO_TOKEN=your_casa_vchasno_api_token_here
```

### How to get your Casa.vchasno API token:

1. Log in to your Casa.vchasno account
2. Navigate to API settings
3. Generate or copy your API token
4. Add it to your environment variables

## 2. Database Setup

The integration requires two new PocketBase collections. You can create them manually or they will be created automatically when first used.

### Collection: `fiscal_receipts`

```javascript
{
  "id": "string",
  "created": "datetime",
  "updated": "datetime",
  "order_id": "relation(orders)", // Optional
  "receipt_type": "select(sale,return,z_report)",
  "fiscal_data": "json", // Optional
  "casa_response": "json", // Optional
  "qr_code": "url", // Optional
  "document_code": "text", // Optional
  "shift_id": "relation(fiscal_shifts)", // Optional
  "status": "select(pending,success,failed)",
  "error_message": "text" // Optional
}
```

### Collection: `fiscal_shifts`

```javascript
{
  "id": "string",
  "created": "datetime", 
  "updated": "datetime",
  "cashier": "text",
  "opened_at": "datetime",
  "closed_at": "datetime", // Optional
  "status": "select(open,closed)",
  "z_report_data": "json", // Optional
  "total_sales": "number", // Optional, default: 0
  "total_returns": "number", // Optional, default: 0
  "receipts_count": "number" // Optional, default: 0
}
```

## 3. Testing the Integration

### Check Environment Configuration

Run the test script to verify your environment:

```bash
node test-casa-vchasno-env.js
```

### Test Receipt Generation

1. Navigate to an order in your order management system
2. Open the order details modal
3. Look for the "Casa.vchasno Fiscal Receipts" section
4. Click "Sale Receipt" or "Return Receipt" to test

### Test Shift Management

1. Navigate to Settings > Fiscal Management
2. Open a new shift with a cashier name
3. Generate some receipts
4. Close the shift to generate a Z-report

## 4. Features

### Fiscal Receipt Generation

- **Sale Receipts**: Generate fiscal receipts for completed orders
- **Return Receipts**: Generate return receipts for refunds
- **QR Codes**: Each receipt includes a QR code for verification

### Shift Management

- **Open Shifts**: Start a new fiscal shift with cashier identification
- **Close Shifts**: End shift and generate Z-report automatically
- **Shift Statistics**: View sales, returns, and receipt counts

### Z-Reports

- **Automatic Generation**: Created when closing shifts
- **Detailed Statistics**: Sales summaries, tax breakdowns, payment methods
- **Export Options**: Download Z-report data as JSON

## 5. API Integration Details

### Base URL
```
https://kasa.vchasno.ua/api/v3
```

### Authentication
All requests use Bearer token authentication with your API key.

### Supported Operations

1. **Sale Receipt**: `POST /fiscal/execute` with `task: 1`
2. **Return Receipt**: `POST /fiscal/execute` with `task: 2`
3. **Z-Report**: `POST /fiscal/execute` with `task: 11`

## 6. Error Handling

The integration includes comprehensive error handling:

- **Network Errors**: Retry logic and proper error messages
- **API Errors**: Detailed error responses from casa.vchasno
- **Validation Errors**: Input validation before API calls
- **Database Errors**: Proper error logging and user feedback

## 7. Security Considerations

- API tokens are stored securely in environment variables
- All fiscal data is encrypted in transit
- Receipt data is stored in PocketBase with proper access controls
- QR codes provide receipt verification

## 8. Troubleshooting

### Common Issues

1. **Missing API Token**
   - Error: "CASA_VCHASNO_TOKEN environment variable is required"
   - Solution: Add your API token to the `.env` file

2. **Invalid API Token**
   - Error: "Authentication error" or HTTP 401
   - Solution: Verify your API token with casa.vchasno

3. **Network Issues**
   - Error: "Failed to connect to casa.vchasno API"
   - Solution: Check internet connection and API status

4. **Database Issues**
   - Error: "Failed to save fiscal receipt"
   - Solution: Verify PocketBase collections exist and permissions

### Debug Mode

Enable detailed logging by setting the environment variable:

```bash
DEBUG=casa-vchasno
```

## 9. Production Deployment

### Environment Variables

Ensure these environment variables are set in production:

```bash
CASA_VCHASNO_TOKEN=your_production_api_token
```

### Monitoring

Monitor the fiscal integration through:

- PocketBase admin dashboard
- Application logs
- Casa.vchasno portal

### Backup

Regularly backup:

- Fiscal receipts data
- Shift records
- Z-reports

## 10. Support

For technical support:

1. Check the casa.vchasno API documentation
2. Review application logs
3. Contact casa.vchasno support for API issues
4. Use the GitHub issues for integration problems

## 11. Legal Compliance

Ensure compliance with local fiscal regulations:

- Keep fiscal receipts for required retention period
- Maintain Z-report records
- Follow cash register regulations
- Regular tax reporting as required

---

This integration provides a complete fiscal receipt solution that meets Ukrainian fiscal requirements while integrating seamlessly with your order management system.