# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Development Commands

### Build & Development
```bash
npm run dev          # Start development server - ONLY run when explicitly requested
npm run build        # Build production version - ONLY run when explicitly requested
npm run start        # Start production server - ONLY run when explicitly requested
npm run lint         # Run ESLint with auto-fix - USE THIS to check for errors instead of build
```

### Command Usage Rules
**IMPORTANT**: Claude Code should follow these strict rules:
- **NEVER** run `npm run dev` or `npm run build` unless explicitly asked by the user
- **ALWAYS** use `npm run lint` to check for code errors and syntax issues
- **NEVER** start development servers automatically
- **ASK PERMISSION** before running any long-running processes
- Use `npm run lint` as the primary method to validate code changes

### Database & Scripts
```bash
npm run sync:orders    # Sync orders from marketplaces
npm run sync:statuses  # Sync marketplace statuses
npm run sync:all       # Run both order and status sync
```

### Testing & Utilities
```bash
tsx scripts/test-rozetka-sync.ts    # Test Rozetka API integration
tsx scripts/test-automation.ts      # Test automation workflows
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Database**: PocketBase (self-hosted backend)
- **Authentication**: Custom PocketBase auth with role-based access
- **UI**: Custom components with Tailwind CSS and shadcn/ui
- **Internationalization**: next-intl (Ukrainian/English)
- **AI**: OpenAI integration for order management assistance

### Key Project Structure
```
app/
├── [locale]/               # Internationalized routes
│   ├── orders/            # Order management pages
│   ├── settings/          # System configuration
│   ├── fiscal/            # Fiscal receipt management
│   └── dashboard/         # Analytics dashboard
├── components/features/    # Business logic components
├── lib/                   # Shared utilities
│   ├── pocketbase.ts      # Database client
│   ├── services/          # External API integrations
│   └── ai/               # AI tools and prompts
└── types/                 # TypeScript definitions
```

## Core Business Logic

### Order Management System
The application manages e-commerce orders from multiple marketplaces (Rozetka, Epicentr, Prom.ua) with these key features:

1. **Multi-marketplace Integration**: Syncs orders from different platforms
2. **Status Mapping**: Maps marketplace-specific statuses to internal system statuses
3. **Order Merging**: Automatically detects and merges duplicate orders from the same customer
4. **Delivery Integration**: Manages Nova Poshta and UkrPoshta delivery tracking
5. **Fiscal Integration**: Casa.vchasno integration for receipt generation

### Order Merging Workflow
Key files: `app/lib/mergeDetection.ts`, `app/lib/mergeUtils.ts`

The system detects duplicate orders by:
- Matching customer phone numbers and names
- Comparing order timestamps and product overlaps
- Providing user confirmation for merge decisions
- Combining product arrays and marketplace IDs
- Syncing status changes across all merged orders

### PocketBase Integration
Key file: `app/lib/pocketbase.ts`

- Handles authentication for both admin and regular users
- Manages real-time subscriptions for order updates
- Provides smart auth wrapper that preserves user sessions
- Includes error handling and retry logic

## Key Configuration Files

### Cursor Rules (.cursorrules)
Contains comprehensive project structure and feature descriptions. Key sections:
- **Internationalization**: Next-intl setup with namespace support
- **Feature Descriptions**: Detailed breakdown of order management, delivery integration, billing
- **Integration APIs**: Rozetka, Epicentr, Prom.ua, Nova Poshta, UkrPoshta, Casa.vchasno
- **Data Flow**: Order processing, status updates, merging workflow

### Component Patterns
- Use `useTranslations` hook for internationalization
- Components follow feature-based organization
- Shared UI components in `components/shared/ui/`
- Business logic in `components/features/`

## Database Schema (PocketBase)

### Core Collections
- `orders`: Main order data with marketplace integration
- `status_options`: Status mapping for different sources
- `sources`: Marketplace and order source definitions
- `users`: User management with role-based access
- `fiscal_receipts`: Casa.vchasno integration
- `blacklist_entries`: Customer blacklist management

### Key Types
Located in `app/types/pocketbase-types.ts` - auto-generated from PocketBase schema.

## External API Integrations

### Marketplace APIs
- **Rozetka**: Order sync, status updates
- **Epicentr**: Order sync, status updates  
- **Prom.ua**: Order sync, status updates

### Delivery Services
- **Nova Poshta**: TTN generation, tracking
- **UkrPoshta**: TTN generation, tracking

### Fiscal Services
- **Casa.vchasno**: Receipt generation, shift management

## Development Guidelines

### Code Quality Standards

**Simplicity & Clarity**
- Write simple, readable code over clever solutions
- Use descriptive variable and function names
- Keep functions small (max 20-30 lines)
- Avoid deep nesting (max 3 levels)
- Extract complex logic into separate functions

**TypeScript Best Practices**
- Always use proper TypeScript types (avoid `any`)
- Use type imports: `import type { User } from './types'`
- Define interfaces for complex objects
- Use enums for string constants
- Add return types to functions

**React Component Standards**
- Use functional components with hooks
- Keep components focused on single responsibility
- Extract custom hooks for reusable logic
- Use proper dependency arrays in useEffect
- Prefer early returns to reduce nesting

**Error Handling**
- Always handle async operations with try-catch
- Use proper error boundaries for React components
- Log errors with context information
- Provide meaningful error messages to users
- Use optional chaining (`?.`) for safe property access

**Performance Guidelines**
- Use React.memo for expensive components
- Implement proper loading states
- Use useMemo/useCallback for expensive calculations
- Optimize database queries with proper fields selection
- Implement proper pagination for large datasets

### File Organization
- Actions in `app/[locale]/*/actions/` for server-side operations
- Components in `app/components/features/` by business domain
- Utilities in `app/lib/` for shared logic
- Types in `app/types/` for TypeScript definitions

### Authentication Patterns
- Use `authenticatedCall()` wrapper for PocketBase operations
- Respect user sessions - avoid switching to admin auth unnecessarily
- Handle both admin and regular user permissions

### Internationalization
- Use `useTranslations` hook with namespace parameter
- Translation files in `messages/{locale}.json`
- Support for Ukrainian (ua) and English (en)

### Error Handling
- Console logging with emoji prefixes for debugging
- Comprehensive error boundaries in React components
- Graceful fallbacks for API failures

## AI Integration

### Tools Available
Located in `app/lib/ai/tools/`:
- Order queries and search
- Financial calculations
- Product popularity analysis
- Weather information

### Usage Pattern
```typescript
const tools = [
  getLastOrderTool,
  calculateBalanceTool,
  // ... other tools
];
```

## Common Workflows

### Adding New Marketplace Integration
1. Create API service in `app/lib/services/`
2. Add status mapping in database
3. Create sync script in `scripts/`
4. Update order sync logic

### Extending Order Management
1. Update PocketBase schema if needed
2. Regenerate types with
  npx pocketbase-typegen@1.1.9 \
  --url http://pocketbase-d04wg4wgw0cs8kcwoww88w0k.78.47.226.230.sslip.io \
  --email andriimazurenko99@gmail.com \
  --password QWEqweqwe382846382846
3. Add validation schemas in `app/lib/validations/`
4. Create/update components in `app/components/features/orders/`

### Testing Integrations
- Use scripts in `scripts/` directory for API testing
- Check logs for detailed debugging information
- Test both success and failure scenarios