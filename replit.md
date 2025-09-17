# Overview

The Ticket War MVP is a comprehensive campus event ticketing system built with Next.js. It serves as a ticket booking and management platform where students can claim tickets for campus events and administrators can manage events, validate tickets, and export attendee data. The system implements a quota-based ticket distribution system with QR code generation for digital tickets and includes real-time ticket validation capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses **Next.js 14 with TypeScript** as the primary framework, implementing the App Router pattern for file-based routing. The UI is built with **TailwindCSS** for styling, following a component-based architecture with reusable components. The frontend includes:

- **Authentication Flow**: Login/register pages for both students and administrators
- **Student Dashboard**: Event browsing, ticket claiming, and digital ticket display with QR codes
- **Admin Panel**: Event management, ticket validation via QR scanning, and attendee export functionality
- **Responsive Design**: Mobile-friendly interface using TailwindCSS utilities

## Backend Architecture
The backend leverages **Next.js API Routes** to create a RESTful API structure:

- **Authentication System**: NextAuth.js with credentials provider for session management
- **Database Layer**: Prisma ORM for type-safe database operations
- **Ticket Management**: Atomic operations for quota management and ticket generation
- **Validation System**: QR code scanning and manual ticket code validation

## Authentication & Authorization
The system implements **NextAuth.js** with role-based access control:

- **Student Role**: Can claim tickets, view personal tickets, and access student dashboard
- **Admin Role**: Can create events, manage ticket batches, validate tickets, and export data
- **Session Management**: JWT-based sessions with role verification on protected routes
- **Password Security**: bcryptjs for password hashing

## Database Design
Uses **Prisma ORM** with a relational database schema including:

- **Users Table**: Stores student and admin accounts with role-based access
- **Events Table**: Event information including quotas, dates, and active status
- **Tickets Table**: Individual ticket records with unique codes and status tracking
- **Ticket Batches Table**: Batch management for controlled ticket releases

## Ticket Generation & Validation
- **Unique Ticket Codes**: Generated using nanoid for collision-resistant identifiers
- **QR Code Generation**: Client-side QR code creation using qrcode.react
- **Digital Tickets**: JSON-based QR data including ticket metadata
- **Validation Methods**: Both QR scanning and manual code input supported

## State Management
- **Client-side State**: React hooks (useState, useEffect) for component state
- **Server State**: Direct API calls with loading states and error handling
- **Session State**: NextAuth useSession hook for authentication state

# External Dependencies

## Database & ORM
- **Prisma**: Database ORM and schema management
- **PostgreSQL**: Primary relational database (configured for deployment)

## Authentication
- **NextAuth.js**: Authentication framework with session management
- **@next-auth/prisma-adapter**: Database adapter for NextAuth sessions

## Caching & Performance
- **Upstash Redis**: Redis-based caching for ticket quota management and atomic operations
- **@upstash/redis**: Redis client for serverless environments

## UI Libraries & Components
- **TailwindCSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography
- **qrcode.react**: QR code generation for digital tickets
- **react-barcode**: Barcode generation capabilities

## Ticket Management
- **nanoid**: Unique ID generation for ticket codes
- **react-qr-barcode-scanner**: QR code scanning functionality for ticket validation

## Form Handling & Validation
- **React Hook Form**: Form state management and validation
- **@hookform/resolvers**: Form validation resolvers
- **Zod**: Schema validation for API endpoints and forms

## Data Export & Utilities
- **xlsx**: Excel file generation for attendee export
- **date-fns**: Date manipulation and formatting utilities
- **clsx**: Conditional className utility
- **tailwind-merge**: TailwindCSS class merging

## Development Tools
- **TypeScript**: Type safety and developer experience
- **ESLint**: Code linting and quality assurance
- **bcryptjs**: Password hashing for authentication security