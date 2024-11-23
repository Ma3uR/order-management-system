# Order Management System

This is a [Next.js](https://nextjs.org) project that provides a comprehensive order management system with internationalization support, authentication, and various management features.

## Features

- 🌐 **Internationalization**: Supports multiple languages (English and Ukrainian) using next-intl
- 🔐 **Authentication**: Secure sign-in functionality using NextAuth.js
- 📦 **Order Management**: Complete order CRUD operations with status tracking
- ⚙️ **Settings Management**: Configure currencies, delivery methods, payment methods, and more
- 🚫 **Blacklist Management**: Manage blocked entries
- 💼 **Project Management**: Handle multiple projects
- 🎨 **Modern UI**: Built with Tailwind CSS and shadcn/ui components

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/app` - Main application routes and API endpoints
- `/components` - Reusable UI components
- `/lib` - Utility functions and database clients
- `/messages` - Internationalization message files
- `/prisma` - Database schema and migrations
- `/scripts` - Utility scripts for database seeding and setup

## Key Components

- **Orders Management**: Complete interface for managing orders with filtering and status updates
- **Settings Page**: Comprehensive settings management for system configuration
- **Authentication**: Secure sign-in system with role-based access
- **API Routes**: RESTful endpoints for all major functionality
- **Database**: Prisma ORM with migrations support

## Database Setup

The project uses Prisma as the ORM. To set up the database:

1. Run migrations: `npx prisma migrate dev`
2. Seed the database: `npx prisma db seed`

## Deployment

The project is optimized for deployment on [Vercel](https://vercel.com). See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
