# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on port 5173
npm run build    # TypeScript check + production build
npm run lint     # ESLint
```

Requires `VITE_API_URL=http://localhost:8001` in `frontend/.env`.

## Architecture

### Directory Layout

```
src/
  api/          # Axios service modules, one per backend domain
  pages/        # Page components; each has a co-located <Page>.css file
  types/        # TypeScript interfaces mirroring backend SQLModel schemas
  store/        # Zustand stores (only authStore.ts exists)
  layouts/      # DashboardLayout — sidebar + <Outlet />
  routes/       # ProtectedRoute — redirects unauthenticated users to /login
  components/   # Shared components (DocumentPreviewModal)
```

### Routing & Auth

`App.tsx` uses a single nested route with `ProtectedRoute > DashboardLayout` as the layout shell for all authenticated pages. `ProtectedRoute` checks Zustand's `useAuthStore`.

Auth state lives in Zustand (`authStore.ts`) and is persisted to `localStorage` as `access_token` (JWT) and `user_data` (JSON). On 401, the Axios response interceptor in `api/client.ts` clears both keys and redirects to `/login`.

### Role-Based UI (RBAC)

Sidebar visibility and feature gating use the `user.actions` string array from the JWT payload, exposed via `useAuthStore`. Pattern in DashboardLayout:

```ts
const hasAction = (action: string) => user?.actions?.includes(action) ?? false;
// e.g. hasAction('Gestión de casos')
```

Action names are Spanish strings matching the `Action.nombre` values in the backend DB.

### API Layer

`src/api/client.ts` — Axios instance with base URL from `VITE_API_URL`, JWT `Authorization` header injected per request.

Each domain has its own module (`casos.ts`, `chatSessions.ts`, `agentChat.ts`, etc.). All use the shared `apiClient`.

**Exception — streaming:** The SSE chat endpoints (`/chat-agent/{id}/stream`, `/chat-agent/general/stream`) are called with native `fetch` (not Axios) because Axios does not support streaming. Auth headers are added manually via `getAuthHeaders()` in `agentChat.ts`. The `consumeSSE()` helper reads `ReadableStream` chunks and calls `onToken` for each `data:` line.

### State Management

- **Server state**: TanStack React Query. Query keys follow the pattern `['entity-name', id]` (e.g., `['caso-detail', casoId]`, `['agent-state', sessionId]`). Mutations call `queryClient.invalidateQueries` on success.
- **Auth state**: Zustand (`useAuthStore`). No other Zustand stores exist.

### Styling

Tailwind CSS 4.x utility classes + scoped plain CSS files per page. CSS class names follow a BEM-like convention using `__` separators (e.g., `chat-page__header`, `chat-page__header-left`, `sidebar__nav-item--active`). All UI text is in **Spanish**.

Design tokens: dark theme, primary `#3B48CC` (cobalt blue), accent `#C5A065` (gold).

### Chat Flow (ChatPage)

1. On mount, fetch agent state via `getAgentState(sessionId)` → populates message history.
2. On send: optimistic update adds user + empty assistant bubble → calls `streamMessage()` → `onToken` callback appends each SSE token to the last assistant bubble.
3. After stream ends, re-fetches agent state to sync LangGraph checkpoint and update RAG context items.
4. Context items (retrieved chunks) are attached to the last assistant message and rendered as citation buttons that open the context panel.

The `system_prompt` object (fetched via `getPrompt(chatSession.system_prompt_id)`) is passed verbatim to `streamMessage()` and forwarded to the backend with each message.

### Key Type/API Mismatches to Know

- `SystemPrompt.id_prompt` (not `id`) — primary key naming is inconsistent across backend models; check `src/types/` before assuming field names.
- `ChatSession.id_session` (string UUID, not integer).
- `Caso.id_caso` (integer).
- The backend `/conocimiento` endpoint uses singular form; all others are plural.
