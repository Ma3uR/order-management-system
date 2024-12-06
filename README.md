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

## Tech Stack

- **Framework**: Next.js 13+
- **Database**: Prisma with SQL database
- **Authentication**: NextAuth.js
- **UI Components**: Custom components with Tailwind CSS
- **Charts**: React-based charting libraries
- **State Management**: React hooks and context
- **API**: RESTful endpoints with Next.js API routes

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

4. Initialize the database:
```bash
npx prisma migrate dev
```

5. Run the development server:
```bash
npm run dev
```

## Project Structure

- `/app` - Next.js application routes and pages
- `/components` - Reusable React components
- `/lib` - Utility functions and shared logic
- `/prisma` - Database schema and migrations
- `/public` - Static assets
- `/styles` - Global styles and CSS
- `/messages` - Internationalization files

## API Routes

- `/api/auth/*` - Authentication endpoints
- `/api/orders/*` - Order management
- `/api/blacklist/*` - Blacklist operations
- `/api/currencies/*` - Currency settings
- `/api/delivery-methods/*` - Delivery options
- `/api/payment-methods/*` - Payment settings
- `/api/sources/*` - Order sources
- `/api/statuses/*` - Order status management
- `/api/user/*` - User settings

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
