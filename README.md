# Order Management System

A Next.js-based order management system with internationalization support and comprehensive order tracking capabilities.

## Features

- 🌐 Multi-language Support (English, Ukrainian)
- 📊 Dashboard with Analytics
- 📦 Order Management
- ⚫ Blacklist Management  
- 🔒 Authentication & Authorization
- 💳 Payment Method Management
- 🚚 Delivery Method Management
- 🎨 Theme Customization
- 📱 Responsive Design

## Tech Stack

- **Framework**: Next.js 13+ with App Router
- **Authentication**: NextAuth.js
- **Database**: Prisma ORM with PocketBase
- **Styling**: Tailwind CSS
- **Charts**: React Charts
- **State Management**: React Context
- **API**: REST endpoints
- **Internationalization**: next-intl

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```
Copy .env.example to .env and fill in required values
```

4. Run migrations:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

## Project Structure

- `/app` - Next.js app router pages and API routes
- `/components` - Reusable UI components
- `/lib` - Utility functions and shared logic
- `/messages` - Internationalization files
- `/prisma` - Database schema and migrations
- `/styles` - Global styles and Tailwind config
- `/utils` - Helper functions

## API Routes

- `/api/auth/*` - Authentication endpoints
- `/api/orders/*` - Order management
- `/api/blacklist/*` - Blacklist management
- `/api/currencies/*` - Currency settings
- `/api/delivery-methods/*` - Delivery options
- `/api/payment-methods/*` - Payment methods
- `/api/sources/*` - Order sources
- `/api/statuses/*` - Order status management
- `/api/user/*` - User management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
