# Overview

ContentCraft is an Instagram content creation application that helps users generate engaging post ideas and create visual content. The application specializes in aesthetic medicine and skincare content, providing tools to generate post concepts, create AI-generated images, and manage uploaded images with modification capabilities. It features a modern React-based frontend with Express.js backend, designed to streamline the content creation workflow for Instagram posts across different formats (feed, story, reel).

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React with TypeScript**: Modern component-based architecture using functional components and hooks
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives with Tailwind CSS styling
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for development and production builds with hot module replacement

## Backend Architecture
- **Express.js Server**: RESTful API architecture with middleware-based request handling
- **File Handling**: Multer for multipart file uploads with memory storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session store
- **Error Handling**: Centralized error handling middleware with structured error responses

## Data Storage Solutions
- **Primary Database**: PostgreSQL with three main entities:
  - Post Ideas: Stores generated content concepts with topic, audience, and format details
  - Generated Images: Manages AI-created images linked to post ideas
  - Uploaded Images: Tracks user-uploaded images and their modifications
- **Schema Management**: Drizzle Kit for database migrations and schema synchronization
- **Connection**: Neon Database serverless PostgreSQL connection

## Authentication and Authorization
- **Session-based Authentication**: Express sessions with secure cookie configuration
- **Session Storage**: PostgreSQL-backed session persistence using connect-pg-simple
- **File Upload Security**: Size limits (10MB) and file type validation for image uploads

## External Service Integrations
- **OpenAI Integration**: 
  - GPT-5 model for generating creative post ideas with structured prompts
  - DALL-E for AI image generation with format-specific sizing
  - Image analysis capabilities for uploaded content
- **Nanobanana API**: Image modification service for enhancing uploaded images
- **Database Hosting**: Neon Database for serverless PostgreSQL hosting
- **Development Tools**: Replit-specific plugins for development environment integration

## Design Patterns
- **Component Composition**: Reusable UI components with prop-based configuration
- **Custom Hooks**: Abstracted API interactions and state management logic
- **Service Layer**: Separated business logic for external API integrations
- **Storage Interface**: Abstract storage layer supporting both in-memory and database persistence
- **Middleware Chain**: Express middleware for logging, error handling, and request processing
- **Schema Validation**: Zod schemas for runtime type checking and API request validation

# External Dependencies

## Core Services
- **Neon Database**: Serverless PostgreSQL database hosting
- **OpenAI API**: AI content generation and image creation services
- **Nanobanana API**: Image modification and enhancement services

## Development and Deployment
- **Replit Platform**: Development environment with integrated tooling
- **Vite**: Build tool and development server
- **Node.js**: Runtime environment for server-side execution

## UI and Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide Icons**: Icon library for UI components

## Data and API Management
- **TanStack Query**: Server state management and caching
- **Drizzle ORM**: Type-safe database ORM with PostgreSQL support
- **Zod**: Runtime type validation and schema definition