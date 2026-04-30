# Order Management System

A modern web application built with Next.js for managing orders, customers, and business operations.

## Features

- 📊 **Dashboard** - Visualize key metrics and business performance
- 📦 **Order Management** - Create, track, and manage orders
- 🔒 **Authentication** - Secure user authentication and authorization
- 🌐 **Internationalization** - Support for multiple languages (English, Ukrainian)
- ⚙️ **Settings Management** - Configure delivery methods, payment options, and more
- 🚫 **Blacklist System** - Manage blocked customers/orders
- 💬 **AI Chat** - AI-powered assistance for order management
- 🧾 **Auto-Fiscal Receipts** - Automatic fiscal receipt generation for completed orders
- 🤖 **Status Automation** - Automated status updates and marketplace synchronization

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: [PocketBase](https://pocketbase.io/) — self-hosted backend (SQLite + auth + realtime)
- **Authentication**: Custom PocketBase auth with role-based access
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) + Tailwind CSS
- **Internationalization**: next-intl (English, Ukrainian)
- **AI**: OpenAI integration for order management assistance
- **Charts**: Chart.js via react-chartjs-2
- **State Management**: React hooks and context
- **API**: Primarily Next.js Server Actions; a small set of route handlers under `/api`

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Configure the following environment variables in the `.env.local` file:
- `NEXT_PUBLIC_POCKETBASE_URL`: URL of your PocketBase instance (default: `http://localhost:8090`).
- `ENABLE_AUTO_FISCAL`: Set to `true` to enable auto-fiscal feature.
- `CASA_VCHASNO_TOKEN`: Your Casa Vchasno API token for fiscal receipt generation.

4. Start PocketBase (the application's backend):
```bash
# Download PocketBase from https://pocketbase.io/docs/ and run it
./pocketbase serve
```
Then open the admin UI at `http://localhost:8090/_/` to create the first admin user and apply the collection schema (see `app/types/pocketbase-types.ts` for the expected shape).

5. (Optional) Regenerate PocketBase TypeScript types after schema changes:
```bash
npx pocketbase-typegen --url $NEXT_PUBLIC_POCKETBASE_URL --email <admin> --password <admin-password>
```

6. Run the development server:
```bash
npm run dev
```

## Project Structure

- `/app` - Next.js App Router routes, pages, server actions, components, and shared libs
  - `/app/[locale]` - Internationalized routes (orders, settings, dashboard, fiscal, blacklist, profile, etc.)
  - `/app/[locale]/*/actions` - Next.js Server Actions used by the UI
  - `/app/api` - The few Next.js route handlers (`chat`, `queue`, `test`)
  - `/app/lib` - Shared utilities, PocketBase client, services, AI tools
  - `/app/components/features` - Business-domain components grouped by feature
- `/components/ui` - shadcn/ui primitive components (root)
- `/hooks` - Shared React hooks (root)
- `/lib` - Root-level shared utilities (`utils.ts`)
- `/styles` - Root global stylesheet
- `/messages` - Internationalization JSON files (`en.json`, `ua.json`, …)
- `/scripts` - One-off TypeScript scripts for marketplace sync, status sync, and data migrations
- `/__tests__`, `/tests` - Jest unit/integration tests and Playwright e2e

## Environment Variables

### Core Variables
```bash
# Application
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090  # PocketBase database URL
POCKETBASE_URL=http://localhost:8090              # Server-side PocketBase URL

# Auto-Fiscal Feature
ENABLE_AUTO_FISCAL=false                          # Enable automatic fiscal receipt generation
CASA_VCHASNO_TOKEN=your_casa_vchasno_api_token    # Casa Vchasno API token
AUTO_CASHIER_NAME=AUTO                            # Default cashier name for auto-generated receipts

# Status Automation
ENABLE_STATUS_AUTOMATION=false                    # Enable automatic status updates
TELEGRAM_BOT_TOKEN=your_telegram_bot_token        # Telegram notifications
TELEGRAM_CHAT_ID=your_telegram_chat_id            # Telegram chat ID

# Marketplace APIs
PROM_UA_TOKEN=your_prom_ua_token                  # Prom.ua marketplace API
EPICENTR_TOKEN=your_epicentr_token                # Epicentr marketplace API
ROZETKA_USERNAME=your_rozetka_username            # Rozetka marketplace API
ROZETKA_PASSWORD=your_rozetka_password
```

## Auto-Fiscal Flow

The auto-fiscal feature automatically generates fiscal receipts when orders reach completed status:

### How It Works
1. **Status Change Trigger**: When an order status is updated in the system
2. **Completion Check**: System checks if new status represents a completed/delivered order (marketplace codes: '6', 'completed', 'delivered')
3. **Receipt Validation**: Verifies order doesn't already have a successful sale receipt
4. **Receipt Generation**: Creates fiscal receipt using Casa Vchasno API
5. **Database Storage**: Saves receipt data to `fiscal_receipts` collection
6. **Notification**: Sends Telegram notification about receipt creation
7. **Error Handling**: Failed receipts are logged with error messages for troubleshooting

### Supported Status Triggers
- Orders with marketplace_code `6` (standard completed status)
- Orders with marketplace_code `completed`
- Orders with marketplace_code `delivered`

### Receipt Data Structure
Generated receipts include:
- Order details (products, quantities, prices)
- Customer information (name, phone)
- Payment method details
- Tax calculations
- QR code for verification
- Document code for tracking

## Server Actions & API Routes

The bulk of the backend logic lives in **Next.js Server Actions** colocated with the routes that use them, not in REST endpoints. The few HTTP route handlers exist where streaming or external callers are needed.

### HTTP Route Handlers (`app/api`)

- `/api/chat` - Streaming chat endpoint for the AI assistant
- `/api/chat/debug/[id]` - Inspect a single chat trace
- `/api/chat/debug/clear/[userId]` - Clear stored chat traces for a user
- `/api/chat/debug/user` - Look up the current user's chat traces
- `/api/queue` - Background job queue endpoint (e.g. fiscal automation)
- `/api/test` - Internal test/health endpoint

### Server Actions (selected)

- `app/[locale]/orders/actions/` - `orders`, `sync`, `nova-poshta`, `rozetka-delivery`, `fiscal-queue`, `fiscal-receipts`, `fiscal-scheduler`, `translations`
- `app/[locale]/settings/actions/` - `connection`, `currencies`, `delivery-methods`, `payment-methods`, `sources`, `statuses`, `sync`, `sync-marketplace-statuses`
- `app/[locale]/blacklist/actions/black-list.ts`
- `app/[locale]/expenses/actions/expenses.ts`
- `app/[locale]/profile/actions/profile.ts`
- `app/[locale]/chat/actions/chat.ts`
- `app/actions/` - Marketplace integrations: `epicentr`, `prom-ua`, `rozetka`, `marketplace-status-sync`

## Troubleshooting

### Auto-Fiscal Issues

#### 1. Check Failed Fiscal Receipts
To identify failed fiscal receipt generation:

```bash
# Query fiscal_receipts collection for failed entries
curl "http://localhost:8090/api/collections/fiscal_receipts/records?filter=status='failed'" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Or through PocketBase Admin UI:
1. Navigate to PocketBase Admin (http://localhost:8090/_/)
2. Go to Collections → `fiscal_receipts`
3. Filter by `status = 'failed'`
4. Check `error_message` field for failure details

#### 2. Common Error Messages

**"CASA_VCHASNO_TOKEN environment variable is required"**
- Solution: Add `CASA_VCHASNO_TOKEN` to your `.env` file
- Verify token is valid with Casa Vchasno

**"Authentication error" or HTTP 401**
- Solution: Check Casa Vchasno API token validity
- Contact Casa Vchasno support for token issues

**"Order already has a successful sale receipt"**
- This is normal behavior - prevents duplicate receipts
- Check existing receipts in fiscal management page

**"Failed to connect to casa.vchasno API"**
- Check internet connectivity
- Verify Casa Vchasno API status
- Check if firewall blocks outbound connections

#### 3. Enable Debug Logging
For detailed fiscal automation logs:

```bash
# Add to .env file
DEBUG=casa-vchasno
```

#### 4. Manual Receipt Generation
If auto-fiscal fails, generate receipts manually:

1. Navigate to **Fiscal Management** page
2. Go to **"Completed Orders Without Receipts"** tab
3. Select failed orders
4. Click **"Generate Receipts"**

#### 5. Check Auto-Fiscal Configuration
Verify environment settings:

```bash
# Check if auto-fiscal is enabled
echo $ENABLE_AUTO_FISCAL  # Should be 'true'

# Check Casa Vchasno token
echo $CASA_VCHASNO_TOKEN  # Should be your API token

# Check cashier name
echo $AUTO_CASHIER_NAME   # Default: 'AUTO'
```

#### 6. Database Issues
Ensure PocketBase collections exist:
- `fiscal_receipts` - Stores receipt data
- `fiscal_shifts` - Stores shift information
- `orders` - Must have proper status relationships

#### 7. Status Code Issues
Auto-fiscal triggers on specific marketplace codes:
- Verify status has `marketplace_code` field set
- Supported codes: '6', 'completed', 'delivered'
- Check status configuration in Settings

### General Application Issues

#### Environment Variables Not Loading
1. Verify `.env.local` file exists in project root
2. Restart development server after changes
3. Check for syntax errors in environment file

#### Database Connection Issues
1. Verify PocketBase is running (http://localhost:8090)
2. Check `NEXT_PUBLIC_POCKETBASE_URL` in environment
3. Verify PocketBase admin credentials

#### API Connection Issues
1. Check marketplace API credentials
2. Verify network connectivity to external APIs
3. Check API rate limits and quotas

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository.
