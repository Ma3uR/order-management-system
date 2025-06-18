# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run linting with auto-fix
```

### Database & Sync Operations
```bash
npm run sync:orders            # Sync orders from all marketplaces
npm run sync:statuses          # Sync marketplace status mappings
npm run sync:all              # Run both order and status sync
npx tsx scripts/test-automation.ts  # Test automation configuration
```

### Data Management
```bash
npm run import-excel           # Import data from Excel files
npm run seed:pb               # Seed PocketBase with test data
npm run add-pb-user           # Add test user to PocketBase
```

## Architecture Overview

This is a **Next.js 14+ multilingual order management system** integrating with Ukrainian marketplaces (Rozetka, Epicentr, Prom.ua) using **PocketBase** as backend database. The system features automated order processing, status synchronization, Telegram notifications, and AI-powered assistance.

## Core System Architecture

### Marketplace Integration Layer (`app/actions/`)
- **Rozetka**: Bearer token auth, comprehensive order sync, status automation
- **Epicentr**: Token-based auth with rate limiting and caching  
- **Prom.ua**: Bearer token authentication with order processing

**Key Integration Patterns:**
- Singleton API classes for connection management
- Token refresh/validation mechanisms
- Unified order processing workflow: detect → validate → map → store → automate
- Status mapping between marketplace and internal statuses

### Service Layer (`app/lib/services/`)
- **`orders.ts`**: Core order management and validation
- **`status-automation.ts`**: Automated status transitions + Telegram notifications
- **`finances.ts`**: Financial calculations and reporting
- **`telegram.ts`**: Notification service with Ukrainian message formatting
- **`nova-poshta.ts`**: Shipping integration

### Database Layer (PocketBase)
- **Connection**: Singleton with auto-reconnection and admin authentication
- **Type Safety**: Generated types from schema (`pocketbase-types.ts`)
- **Authentication**: Server-side admin auth for operations, client-side persistence
- **Pattern**: `authenticatedCall()` wrapper for all database operations

### Automation System (`scripts/`)
- **Order Sync**: Automated marketplace order synchronization
- **Status Sync**: Bidirectional status mapping and updates
- **Status Automation**: Detects "New" status orders → changes to "Processing" → sends Telegram notifications
- **Configuration**: Environment-based feature flags and marketplace settings

## Critical Code Patterns

### Server Actions Architecture
All server operations use `'use server'` directive with authenticated PocketBase calls:
```typescript
export async function serverAction() {
  'use server'
  return await authenticatedCall(async () => {
    return await pb.collection('orders').create(data);
  });
}
```

### Marketplace Configuration Pattern
```typescript
const MARKETPLACE_CONFIGS: Record<string, MarketplaceConfig> = {
  'rozetka': {
    source: '4tvf116a5aitwmb',
    newStatusCodes: [1],
    processingStatusCode: 26,
    setStatusFunction: setRozetkaStatus
  }
};
```

### Error Handling Strategy
- Graceful degradation for marketplace failures
- Detailed logging with structured error information  
- Retry mechanisms for network operations
- Never break sync process due to automation failures

## Environment Configuration

### Required Environment Variables
```bash
# PocketBase
POCKETBASE_URL=http://localhost:8090
POCKETBASE_EMAIL=admin@example.com
POCKETBASE_PASSWORD=password

# Marketplace APIs
ROZETKA_TOKEN=your_token
EPICENTR_TOKEN=your_token
PROM_UA_TOKEN=your_token

# Automation (optional)
ENABLE_STATUS_AUTOMATION=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
ROZETKA_PROCESSING_STATUS_CODE=status_code
```

## Database Schema Knowledge

### Key Collections
- **`orders`**: Central order storage with marketplace mapping
- **`status_options`**: Internal status definitions
- **`marketplace_statuses`**: Marketplace-specific status mappings
- **`sync_records`**: Automation and sync tracking
- **`products`**: Product catalog with production costs
- **`blacklist_items`**: Blocked customers/orders

### Status System
- Internal status ID: `zrebd3ngst3qnu4` = "Обрабатывается менеджером" (Processing)
- New status variants: `['New', 'new', 'NEW', 'Новий', 'новий', 'НОВИЙ', 'Новый', 'новый', 'НОВЫЙ']`
- Status automation triggers on "New" → changes to "Processing" → sends notifications

## Internationalization (i18n)

- **Supported Languages**: English (`en`), Ukrainian (`ua`)
- **Translation Files**: `messages/{locale}.json` with nested structure
- **Usage**: `useTranslations('namespace')` in components
- **Routing**: Locale-based routing with `[locale]` dynamic segments
- **Fallbacks**: English as default fallback language

## AI Integration

- **Location**: `app/lib/ai/tools/` for business-specific AI functions
- **Integration**: OpenAI with custom provider configuration
- **Tools**: Order analysis, financial calculations, product insights
- **Chat**: Persistent chat history with business context

## File Structure Conventions

- **Components**: `app/components/features/{feature}/` for feature-specific components
- **Actions**: `app/[locale]/{feature}/actions/` for server actions
- **Validations**: `app/lib/validations/` for Zod schemas
- **Types**: `app/types/` for TypeScript interfaces
- **Scripts**: `scripts/` for automation and maintenance tasks

## Development Guidelines

### Type Safety Requirements
- Use generated PocketBase types for all database operations
- Validate all inputs with Zod schemas before processing
- Use TypeScript strict mode - no `any` types
- Interface-driven development for marketplace integrations

### Database Operation Patterns
- Always use `authenticatedCall()` wrapper for PocketBase operations
- Implement proper error handling with user-friendly messages
- Use transactions for multi-step operations
- Expand relationships when needed: `pb.collection('orders').getList(1, 20, { expand: 'status' })`

### Automation Development
- Test automation configuration with `npx tsx scripts/test-automation.ts`
- Monitor automation results in sync script output
- Ensure graceful failure - automation errors should not break sync
- Log detailed automation events for debugging

### Marketplace Integration
- Follow singleton pattern for API clients
- Implement token refresh mechanisms
- Handle rate limiting and network timeouts
- Map marketplace data to internal schema before storage
- Always validate data with Zod schemas

## Testing & Debugging

### Configuration Testing
```bash
# Test automation setup
npx tsx scripts/test-automation.ts

# Test specific marketplace sync
npm run sync:orders

# Check PocketBase connection
# Access admin UI at http://localhost:8090/_/
```

### Common Debug Points
- Check PocketBase admin authentication in server actions
- Verify marketplace API tokens and permissions
- Monitor automation logs in sync script output
- Validate environment variables for all integrations
- Test Telegram bot configuration for notifications

## Key Business Logic

### Order Merging Workflow
1. Detect unprocessed orders with matching customer data (name/phone)
2. Notify user about potential merge opportunities
3. Merge common fields automatically
4. Request user resolution for conflicting fields  
5. Combine product arrays and marketplace ID collections
6. Sync status changes across all merged marketplace orders

### Status Automation Flow
1. Detect orders with "New" status variants during sync
2. Update Rozetka API status to "Processing"
3. Update local database status to processing ID
4. Send formatted Telegram notification in Ukrainian
5. Log automation results and handle errors gracefully

### Delivery Integration
- **Nova Poshta**: TTN generation and tracking
- **Ukr Poshta**: TTN generation and tracking  
- **Auto-messaging**: Customer notifications for unclaimed packages

This system requires understanding of Ukrainian e-commerce workflows, PocketBase patterns, and multi-marketplace integration strategies.