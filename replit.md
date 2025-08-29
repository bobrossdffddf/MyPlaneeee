# Overview

PTFS ATC24 is a ground crew coordination system built for aviation service management. The application enables pilots to request ground services (fuel, catering, baggage handling, maintenance, pushback, ground power, cleaning, and lavatory services) at various airports, while ground crew members can claim and manage these service requests. The system features real-time communication through WebSocket connections and includes a chat system for coordination between pilots and ground crew.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with CSS variables for theming, supporting dark mode
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: OpenID Connect integration with Replit Auth using Passport.js
- **Session Management**: Express sessions stored in PostgreSQL with connect-pg-simple
- **Real-time Communication**: WebSocket server for live updates on service requests
- **API Design**: RESTful endpoints with consistent error handling and logging middleware

## Database Schema
- **Users**: Stores user authentication data and profile information
- **Airports**: Pre-seeded with major US airports (JFK, LAX, ORD, etc.)
- **Service Requests**: Core entity tracking service type, status, airport, gate, and flight details
- **Chat Messages**: Real-time messaging between pilots and ground crew for each service request
- **Sessions**: Authentication session storage

## Authentication & Authorization
- **Provider**: Replit OpenID Connect with automatic user provisioning
- **Session Storage**: Server-side sessions with PostgreSQL backend
- **Security**: HTTP-only cookies, CSRF protection, secure session configuration
- **User Roles**: Dynamic role switching between pilot and ground crew within the application

## Real-time Features
- **WebSocket Integration**: Bidirectional communication for service request updates
- **Live Chat**: Real-time messaging system between pilots and ground crew
- **Status Updates**: Instant notifications when requests are claimed, updated, or completed
- **Automatic Reconnection**: WebSocket client handles connection drops gracefully

# External Dependencies

## Database
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Database URL**: Environment variable configuration for database connectivity

## Authentication Services
- **Replit Auth**: OpenID Connect provider for user authentication
- **Session Secret**: Environment variable for session encryption

## Development Tools
- **Vite**: Frontend development server with HMR and build optimization
- **Replit Integration**: Custom Vite plugins for Replit environment compatibility
- **TypeScript**: Full-stack type safety with shared schema definitions

## UI Dependencies
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide Icons**: Consistent iconography throughout the application
- **Date-fns**: Date formatting and manipulation utilities