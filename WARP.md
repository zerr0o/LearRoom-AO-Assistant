# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

LearRoom-AO-Assistant is a React-based AI assistant application built with Vite and TypeScript. It provides an intelligent document analysis system specifically designed for analyzing tender documents (appels d'offre) with PDF document vectorization and semantic search capabilities using OpenAI's Assistant API.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server (port 5173 by default)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

### Environment Setup
The project requires environment variables for Supabase authentication:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

Users must provide their OpenAI API token through the application settings interface after authentication.

## Architecture Overview

### Core Application Flow
The application follows a conversation-based architecture where users authenticate via Supabase, create conversations, upload PDF documents for vectorization, and interact with an AI assistant that can perform semantic searches across uploaded documents.

### Key Technical Components

#### Authentication Layer (Supabase)
- Manages user authentication through `src/utils/supabase.ts`
- Session persistence handled in `App.tsx` with auth state listeners
- Email-based authentication flow through `AuthPage.tsx`

#### OpenAI Integration (`src/hooks/useOpenAI.ts`)
This is the most complex component, implementing:
- **Vector Store Management**: Creates and manages OpenAI vector stores for document storage
- **Document Vectorization**: Uploads PDFs to OpenAI, creates embeddings, and indexes them
- **Assistant API Integration**: Uses OpenAI's Assistant API with `file_search` capability
- **Citation Extraction**: Processes annotations from AI responses to provide document references
- **Fallback Strategy**: Falls back to standard chat completions when no vector store exists

The assistant workflow:
1. Creates/retrieves an assistant configured with file_search tool
2. Creates conversation threads
3. Manages message history
4. Executes runs and polls for completion
5. Extracts and formats citations from responses

#### State Management
- Uses React hooks and local storage for persistence (`useLocalStorage` custom hook)
- Conversation state includes messages, documents, and vector store IDs
- Settings stored separately for OpenAI token management

#### Document Processing Pipeline
1. File upload triggers vectorization in `handleFileUpload`/`handleFilesUpload` 
2. Creates vector store if needed
3. Uploads file to OpenAI with 'assistants' purpose
4. Adds file to vector store
5. Polls for processing completion
6. Updates conversation with document metadata

### Component Structure
- **App.tsx**: Main application orchestrator, manages authentication, conversations, and routing
- **ChatInterface.tsx**: Handles message display and input, integrates file upload UI
- **ConversationsList.tsx**: Sidebar for conversation management
- **MessageBubble.tsx**: Renders individual messages with citation support
- **FileUpload.tsx**: Document upload interface with progress tracking
- **CitationReference.tsx**: Displays document citations inline with messages

### Styling Approach
- Tailwind CSS for utility-first styling
- Responsive design with mobile-first considerations
- Lucide React for consistent iconography
- Custom animations for loading states

## Critical Implementation Details

### Vector Store Lifecycle
- Vector stores are created per conversation
- Configured with 7-day expiration (`expires_after`)
- Store ID persisted in conversation state
- Files can be added incrementally to existing stores

### Citation Processing
The application processes OpenAI's file_citation annotations:
- Extracts citation metadata from message annotations
- Replaces inline references with numbered citations
- Maintains source file information for reference display

### Error Handling Patterns
- Comprehensive try-catch blocks in async operations
- User-friendly error messages via alerts
- Loading and progress states for long operations
- Fallback behaviors for API failures

### Mobile Responsiveness
- Collapsible sidebar with overlay on mobile
- Responsive text sizes and padding
- Touch-friendly interaction targets
- Adaptive layouts using Tailwind breakpoints

## Important Considerations

### OpenAI API Usage
- Requires user-provided API key (stored in local storage)
- Uses gpt-4o-mini model for cost efficiency
- Implements polling with timeout limits
- File uploads limited by OpenAI's file size restrictions

### Supabase Integration  
- Authentication-only usage (no database operations)
- Session management with automatic refresh
- Logout cleanup handled properly

### Performance Optimizations
- Message history limited to recent messages for context
- Lazy loading patterns for document synchronization  
- Debounced textarea auto-resize
- Optimized re-renders with proper React patterns

## Development Patterns

### TypeScript Usage
- Comprehensive type definitions in `src/types/index.ts`
- Strict typing for all components and hooks
- Interface-based prop definitions

### React Best Practices
- Functional components with hooks
- Proper cleanup in useEffect
- Controlled components for forms
- Memoization where beneficial

### File Upload Handling
- Single and batch file upload support
- Progress tracking with step visualization
- Proper error recovery mechanisms
- File type validation for PDFs