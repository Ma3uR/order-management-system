# Next.js E-commerce Admin Dashboard

This is a comprehensive admin dashboard application built with Next.js 13+, featuring internationalization, authentication, and various management interfaces for e-commerce operations.

## Features

- **Authentication**: Secure sign-in system using NextAuth
- **Internationalization**: Multi-language support (English and Ukrainian)
- **Order Management**: Complete order tracking and management system
- **Blacklist Management**: User blacklist functionality
- **Settings Management**: Comprehensive system settings including:
  - Currency management
  - Delivery methods
  - Payment methods
  - Status management
  - Project settings

## Tech Stack

- **Framework**: Next.js 13+
- **Language**: TypeScript
- **Database**: Prisma with SQL database
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Components**: Custom UI components built with shadcn/ui
- **State Management**: React Hooks
- **API**: REST API endpoints built with Next.js API routes
- **Internationalization**: next-intl

## Project Structure

```
├── app/                      # Next.js 13+ app directory
│   ├── [locale]/            # Localized routes
│   ├── api/                 # API routes
│   └── components/          # Application components
├── components/              # Shared components
│   └── ui/                 # UI component library
├── lib/                     # Utility libraries
├── messages/                # Internationalization messages
├── prisma/                  # Database schema and migrations
├── scripts/                 # Utility scripts
└── styles/                  # Global styles
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   - Copy `.env.example` to `.env`
   - Configure your database connection and other required variables

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Routes

The application includes various API endpoints for:
- Authentication
- Order management
- Blacklist management
- Currency settings
- Delivery methods
- Payment methods
- Status management
- User management

## Database Schema

The database schema includes tables for:
- Users
- Orders
- Blacklist entries
- Currencies
- Delivery methods
- Payment methods
- Statuses
- Projects

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
