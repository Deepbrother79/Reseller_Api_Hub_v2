# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot-reloading
- `npm run build` - Build for production  
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally

## Architecture Overview

This is a **Token Transaction Hub** - a React-based web application for managing digital token transactions and API services. The application uses:

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom themes
- **Backend Integration**: Supabase for data persistence and serverless functions
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: React Router DOM
- **Form Handling**: React Hook Form with Zod validation

### Key Application Structure

**Core Pages:**
- `/` (Index) - Main dashboard with transaction processing forms and history
- `/services-utils` (ServicesUtils) - Utility services for 2FA, OAuth, email processing, etc.

**Main Features:**
1. **Transaction Processing** - Submit token requests with product selection and quantity
2. **Transaction History** - View and filter past transactions 
3. **Refund System** - Process refund requests for failed transactions
4. **API Endpoints Panel** - Display and test available API endpoints
5. **Service Utilities** - Additional services like 2FA, OAuth tokens, email inbox reading

### Data Layer
- **Supabase Integration**: Client configured in `src/integrations/supabase/client.ts`
- **API Routes**: Server-side API handlers in `src/pages/api/` (process.js, history.js, products.js)
- **Database Operations**: Supabase functions called via Edge Functions

### Component Organization
- **UI Components**: `src/components/ui/` - shadcn/ui component library
- **Feature Components**: `src/components/` - Application-specific components
- **Service Components**: `src/components/services/` - Service-specific utilities (2FA, OAuth, etc.)

### Key Data Models
- **Product**: Items with categories, subcategories, quantities, and values
- **Transaction**: Processing records with status, timestamps, and results
- **API Endpoints**: Dynamic endpoint configurations with request/response examples

### Configuration Files
- **Vite Config**: `vite.config.ts` - Build and dev server configuration
- **Tailwind**: `tailwind.config.ts` - UI styling configuration  
- **TypeScript**: `tsconfig.json` - Type checking configuration
- **ESLint**: `eslint.config.js` - Code quality rules

## Development Workflow

When working on this codebase:

1. **Component Development**: Follow existing patterns in `src/components/` - use shadcn/ui components, TypeScript interfaces, and proper error handling
2. **API Integration**: New API calls should use React Query and follow the patterns in existing components
3. **Styling**: Use Tailwind classes and follow the existing design system
4. **Forms**: Use React Hook Form with Zod validation as seen in existing form components
5. **State Management**: Use React Query for server state, local React state for UI state

## Important Notes

- This is a Lovable-generated project with automatic deployments
- Supabase credentials are embedded in the client configuration
- API endpoints support both GET and POST methods with CORS enabled
- The application handles real-time notifications and transaction status updates
- Service utilities include sensitive operations (2FA, OAuth) - handle with appropriate security considerations