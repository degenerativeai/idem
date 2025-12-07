# Overview

This is a full-stack web application called "Idem" that generates synthetic training datasets for AI image generation models. The application uses Google's Gemini AI to analyze subject images and create detailed prompt datasets for LoRA (Low-Rank Adaptation) training. It features a three-tab workflow: image analysis and generation, dataset creation, and image synthesis using multiple providers (Google Gemini and Wavespeed).

The application is built as a monorepo with a React/TypeScript frontend using shadcn/ui components, an Express backend, and PostgreSQL database for persistent storage of identity profiles and generated datasets.

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

## Backend Architecture

**Framework**: Express.js with TypeScript, running on Node.js.

**API Design**: RESTful API with routes for:
- Identity profiles (POST, GET list, GET by ID)
- Datasets (POST, GET list, GET by ID, PATCH for progress updates)

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
- Monolithic server structure (all routes in single file)
- Centralized storage abstraction layer
- Environment-based configuration (development vs production)

## Data Storage

**Database**: PostgreSQL via Drizzle ORM.

**Schema Design**:

*Identity Profiles Table*:
- Stores analyzed subject data from Gemini vision API
- Contains JSON blob of full analysis result
- Stores three image types: source, headshot, bodyshot (as text/base64)
- UUID primary key with auto-generation

*Datasets Table*:
- Links to identity profiles via foreign key
- Stores array of prompt items as JSONB
- Tracks generation progress (target vs generated count)
- Includes safety mode flag (SFW/NSFW)

**ORM Choice Rationale**:
- Drizzle provides type-safe database queries
- Schema-first approach with TypeScript inference
- Zod integration for runtime validation
- Lightweight compared to alternatives like Prisma

**Migration Strategy**: Schema defined in `shared/schema.ts`, migrations generated in `/migrations` directory using drizzle-kit.

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

**Third-Party Services**:
- PostgreSQL database (connection via DATABASE_URL environment variable)
- Session storage via connect-pg-simple (PostgreSQL-backed sessions)

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
- Database connection pooling for performance
- CORS and rate limiting preparation (dependencies present but not configured)