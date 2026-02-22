# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ayman Academy Portal - A bilingual (Arabic/English) educational platform built with React + TypeScript + Vite. Supports three user roles (super_admin, teacher, student) with role-based content management, lesson creation, and learning features.

## Development Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:8080
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # Run ESLint

# The dev server runs on port 8080 with IPv6 support (host: "::")
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components (Radix UI primitives)
- **Backend**: Supabase (auth + PostgreSQL)
- **State**: TanStack Query (React Query) for server state
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation

### Core Context Providers (in App.tsx)
1. **AuthContext** - Manages user authentication and profiles with retry logic
2. **LanguageContext** - Bilingual support (Arabic RTL / English LTR)
3. **SettingsContext** - Application settings
4. **TemplateContext** - Dynamic text templates with token interpolation

### User Roles & Routes
- **super_admin**: Full access to `/admin/*` routes (teacher management, content management, homepage management)
- **teacher**: Access to `/teacher/*` routes (lesson creation/editing, profile)
- **student**: Access to `/student/*` routes (learning dashboard, lessons, quizzes)

Teachers and super_admins can access teacher routes. Only super_admins can access admin routes.

### Key Architectural Patterns

#### Bilingual Support
Use the `useLanguage()` hook to access:
- `language`: 'ar' | 'en'
- `direction`: 'rtl' | 'ltr'
- `t(arabicText, englishText)`: Translation helper

Example:
```tsx
const { t, language } = useLanguage();
<h1>{t('مرحبا', 'Welcome')}</h1>
```

All UI text should support both languages. Database fields follow naming convention: `field_ar`, `field_en`.

#### Database Operations
Use `src/lib/adminDb.ts` for CRUD operations instead of direct Supabase calls. It provides:
- Verified operations that re-fetch data to confirm changes
- Automatic error handling and toast notifications
- Auth checks before mutations

Example:
```tsx
import { verifiedUpdate } from '@/lib/adminDb';
await verifiedUpdate('subjects', id, { title_ar: 'new title' });
```

#### Lesson Content System
Lessons use a **block-based content editor** (`src/components/admin/lessons/LessonEditor.tsx`):
- Content stored in `lesson_content` table as JSON blocks
- Block types: text, heading, video, image, code, quiz, etc.
- Drag-and-drop reordering with `@dnd-kit`
- AI-powered content assistance (placeholder implementation in `src/lib/aiService.ts`)

#### Template System
Dynamic text templates with token interpolation ({{token}}):
- Templates stored in `templates` table with variables JSONB
- Use `useTemplates()` hook to access `getTemplate()` and `renderTemplate()`
- Tokens are HTML-escaped by default for XSS protection
- Example tokens: `{{student_name}}`, `{{subject_name}}`, `{{date}}`

#### Authentication Flow
- Session stored in localStorage with key `ayman-academy-auth`
- Profile fetch on auth with timeout (1.5s) and retry logic
- Auto-redirect based on role after login
- Protected routes via `<ProtectedRoute allowedRoles={['role']}>` wrapper

### Path Aliases
All imports use `@/` alias for `src/`:
```tsx
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
```

### Component Organization
- `/components/ui/*` - shadcn/ui components (auto-generated, minimal edits)
- `/components/admin/*` - Admin-specific components
- `/components/teacher/*` - Teacher-specific components
- `/components/student/*` - Student-specific components
- `/components/home/*` - Public homepage sections
- `/components/layout/*` - Shared layout components (Header, Footer)
- `/components/auth/*` - Authentication components
- `/pages/*` - Route page components

### Database Schema Key Tables
- `profiles` - User profiles (id, email, full_name, role, bio_ar, bio_en, etc.)
- `stages` - Educational stages (formerly "levels") - كتاب تمهيدي، ابتدائي، متوسط
- `subjects` - Subjects within stages
- `lessons` - Lesson metadata (title, summary, objectives, order)
- `lesson_content` - Lesson content blocks (type, data JSONB, order)
- `quizzes` - Quiz metadata
- `quiz_questions` - Quiz questions with options
- `templates` - Dynamic text templates with variables

### Environment Variables
Required in `.env`:
```env
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Important Development Notes

### TypeScript Configuration
- `noImplicitAny: false` - Type annotations not strictly enforced
- `strictNullChecks: false` - Null checks relaxed
- Use explicit types for database models from `src/types/database.ts`

### React Query Configuration
- Configured to NOT refetch on window focus or reconnect
- Retries disabled by default
- Prevents unwanted reloads when switching tabs

### AI Service Integration
`src/lib/aiService.ts` is currently a placeholder. To integrate real AI:
1. Uncomment Supabase Edge Function call, OR
2. Add OpenAI/Gemini API integration
3. Update `processAIRequest()` function

Supported AI actions: expand, simplify, generate_example, generate_summary, generate_quiz, improve_language, translate_ar_en, translate_en_ar

### Translation System
`src/lib/translation.ts` contains utilities for translating content between Arabic and English. Currently uses placeholder implementation but ready for API integration.

### Template Rendering
Use `renderTemplate()` from `src/lib/templateRenderer.ts` for safe token interpolation:
- Replaces `{{token}}` with values
- HTML-escapes by default
- Supports allowlist from template.variables
- Sample token values available for previews

### shadcn/ui Components
Add new components with:
```bash
npx shadcn@latest add <component-name>
```
Components are configured in `components.json` with Tailwind config in `tailwind.config.ts`.

## Common Tasks

### Adding a New Page
1. Create page component in `src/pages/<role>/PageName.tsx`
2. Add route in `src/App.tsx` under appropriate role section
3. Add navigation link in role-specific layout component
4. Use `useLanguage()` for bilingual text

### Adding a New Lesson Block Type
1. Add type to `ContentItemType` in `src/types/database.ts`
2. Update `BlockEditor.tsx` to render the new block type
3. Add block creation UI in lesson editor
4. Update `LessonContentViewer.tsx` for student view

### Creating Admin CRUD Pages
1. Use `verifiedInsert`, `verifiedUpdate`, `verifiedDelete` from `adminDb.ts`
2. Use TanStack Query for data fetching with proper cache invalidation
3. Follow bilingual pattern (field_ar, field_en)
4. Include active/inactive toggle (`is_active` field)
5. Add sort_order for orderable items

### Working with Forms
Use React Hook Form + Zod:
```tsx
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {...}
});
```

Common pattern in admin forms:
- Tabs for AR/EN content
- Active/inactive toggle
- Order/sort fields
- Submit with toast feedback
