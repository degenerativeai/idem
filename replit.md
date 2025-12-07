# Overview

This is a frontend-focused web application called "Idem" that generates synthetic training datasets for AI image generation models. The application uses Google's Gemini AI to analyze subject images and create detailed prompt datasets for LoRA (Low-Rank Adaptation) training. It features a three-tab workflow: image analysis and generation, dataset creation, and image synthesis using multiple providers (Google Gemini and Wavespeed).

The application is built as a monorepo with a React/TypeScript frontend using shadcn/ui components and a minimal Express backend for serving the frontend. All data is managed client-side without database persistence.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 19 with TypeScript, using Vite as the build tool and development server.

**UI Components**: Leverages shadcn/ui component library (Radix UI primitives) with Tailwind CSS for styling. The design system uses a "New York" style variant with custom CSS variables for theming.

**State Management**: React Query (@tanstack/react-query) for server state management and caching. Session storage is used for API key persistence.

**Routing**: Wouter for lightweight client-side routing.

**Component Structure**:
- Three main workflow tabs: VisionStructParser, DatasetGenerator, and ImageGenerator
- Custom components in `client/src/idem/components/` handle the core application logic
- Shared UI components from shadcn/ui in `client/src/components/ui/`

**Design Decisions**:
- Session-based API key storage (security consideration: keys stored client-side)
- Tab-based navigation for multi-step workflow
- Base64 image handling for file uploads and image generation results
- All data managed in-memory on the client (no database persistence)

## Backend Architecture

**Framework**: Express.js with TypeScript, running on Node.js.

**Server Setup**:
- Development mode uses Vite middleware for HMR
- Production mode serves static built files
- HTTP server creation for potential WebSocket support

**Middleware Stack**:
- JSON body parsing with raw body preservation (for webhook verification)
- URL-encoded form parsing
- Request logging with timestamp and duration tracking
- Static file serving for production builds

**Design Decisions**:
- Minimal backend - serves frontend only, no API routes
- All application logic resides in the frontend
- Environment-based configuration (development vs production)

## Data Storage

**Architecture**: No database - all data managed client-side.

**Data Types** (defined in `shared/schema.ts`):
- Identity profiles: Stores analyzed subject data from Gemini vision API
- Datasets: Stores arrays of prompt items with generation progress
- Zod schemas for runtime validation

**Design Rationale**:
- Simplified deployment without database dependencies
- Application works as a stateless tool
- Users export data via JSON/ZIP downloads
- No server-side data persistence needed for the use case

## External Dependencies

**Google Gemini AI** (@google/genai):
- Vision analysis for subject identification
- Structured output generation for identity profiles
- Prompt generation using custom system directives
- Text-to-image generation capabilities

**Image Generation Providers**:
- Google Gemini (primary): Native integration via SDK
- Wavespeed API (alternative): RESTful API for image generation with edit mode support
- Both support configurable aspect ratios and resolutions

**Key Libraries**:
- Zod: Runtime schema validation and type inference
- React Hook Form: Form state management
- File-saver & JSZip: Client-side file generation and download
- Lucide React: Icon library
- date-fns: Date manipulation utilities

**Replit-Specific Integrations**:
- Vite plugins for runtime error overlay, cartographer, and dev banner
- Custom meta images plugin for OpenGraph tag management
- Environment detection via REPL_ID variable

**Design Considerations**:
- API keys managed client-side (security trade-off for simplicity)
- Support for multiple image generation backends
- No external database dependencies
- CORS and rate limiting preparation (dependencies present but not configured)
