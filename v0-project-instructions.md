# Dashboard Component Project Instructions

## Project Overview
This is a Next.js 14+ React dashboard application for order management with AI integration. The dashboard displays revenue analytics, order statistics, and includes an AI chat interface.

## Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: PocketBase
- **Authentication**: Custom PocketBase auth
- **Animation**: Framer Motion
- **Charts**: Custom chart components
- **AI**: AI SDK with OpenAI integration
- **Internationalization**: next-intl

## Dashboard Architecture

### Main Dashboard Component (`Dashboard.tsx`)
- **Location**: `app/components/features/dashboard/Dashboard.tsx`
- **Purpose**: Central dashboard displaying revenue metrics, charts, and AI chat
- **Key Features**:
  - Real-time order data fetching from PocketBase
  - Revenue calculation with month-over-month comparison
  - Traffic source analytics with color-coded visualization
  - Monthly revenue chart
  - Integrated AI chat interface

### Dashboard Layout (`layout.tsx`)
- **Location**: `app/[locale]/dashboard/layout.tsx`
- **Features**:
  - Authentication guard with session management
  - Sidebar navigation with responsive design
  - Theme toggle (light/dark mode)
  - Language switcher
  - Breadcrumb navigation

### Component Structure
```
dashboard/
├── Dashboard.tsx          # Main dashboard component
├── TotalRevenue.tsx       # Revenue display with trend
├── MonthlyChart.tsx       # Bar chart for monthly data
├── TrafficChannel.tsx     # Donut chart for traffic sources
├── AiChatBox.tsx         # AI chat interface
├── ChatNavButton.tsx     # Chat navigation
├── ai-tools-renderer.tsx # AI tools rendering
└── useSession.ts         # Session management hook
```

## Key Features

### Revenue Analytics
- Total revenue calculation from orders
- Month-over-month percentage change
- Currency-aware display (€ symbol)
- Mini line chart trend visualization

### Traffic Source Analysis
- Color-coded source breakdown
- Percentage-based donut chart
- Dynamic source mapping with fallbacks
- Hardcoded color scheme for known sources (Rozetka, PromUa, etc.)

### AI Integration
- Full-height chat interface (800px)
- AI tools for financial analysis, order management, product insights
- Real-time chat with persistent history
- Tool-based responses for order data, weather, calculations

### Data Management
- PocketBase integration with authenticated API calls
- Order collection with currency expansion
- Source collection for traffic analytics
- Error handling with fallback data
- Loading states with spinners

## Styling Guidelines
- Use Tailwind CSS classes
- Dark mode support with `dark:` prefixes
- Responsive design with `md:`, `lg:` breakpoints
- Framer Motion animations with stagger effects
- shadcn/ui component system

## Authentication Flow
1. Session check on layout mount
2. Redirect to login if unauthenticated
3. Admin authentication for data access
4. Token-based API requests

## Development Notes
- Components use TypeScript interfaces for type safety
- Async data fetching with useEffect and AbortController
- Error boundary handling
- Mobile-responsive sidebar navigation
- Internationalization support with next-intl

## File Locations
- Dashboard: `app/components/features/dashboard/`
- Layout: `app/[locale]/dashboard/layout.tsx`
- Types: `app/types/orders.ts`
- Utils: `app/lib/pocketbase.ts`
- Styles: `app/globals.css`

## Core Data Types
```typescript
interface Order {
  id: string;
  amount: number;
  source: string;
  createdAt: string;
  currency: {
    symbol: string;
  };
}

interface Source {
  id: string;
  name: string;
  color: string;
}
```

## Chart Components
- **TotalRevenue**: Displays total revenue with trend line
- **MonthlyChart**: Bar chart showing monthly revenue data
- **TrafficChannel**: Donut chart for source breakdown
- **AiChatBox**: Full-height AI chat interface

## AI Tools Integration
- Financial balance calculations
- Order management tools
- Product popularity analysis
- Weather information
- Salary calculations

## Mobile Responsiveness
- Responsive grid layouts
- Mobile-optimized sidebar
- Touch-friendly interactions
- Adaptive chart sizing

## Performance Features
- Lazy loading for components
- Optimized re-renders
- Efficient data fetching
- Memory leak prevention with cleanup