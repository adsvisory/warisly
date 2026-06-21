# IMPLEMENTATION BRIEF: Web App Scaffold (apps/web)
## Surface: web (owner + heir)
## Brief: #0b
## Phase: 1 (MVP)
## Depends on: #0a
## Blocks: #2, #3, #4c
## Parallel with: #0c

### CONTEXT
The public Next.js 15 app (owner + heir surfaces) that consumes `@warisly/{ui,db,lib}`: brand fonts, Tailwind via the shared preset, Supabase cookie-bound clients, Zod env with a `server-only` secret boundary, base layout, landing page.

### NON-NEGOTIABLE CHECK
No credentials/money/provider-auth. `SUPABASE_SERVICE_ROLE_KEY` lives only behind `apps/web/src/lib/supabase/admin.ts` (`server-only`); the browser/server clients use the anon key and stay RLS-scoped to the signed-in user. Bahasa-first (`<html lang="id">`).

### PRE-FLIGHT CHECKS
- [ ] Brief #0a done (workspace + packages resolve).
- [ ] Supabase URL + anon key + service-role key on hand.

### FILES TO CREATE/MODIFY

#### 1. `apps/web/package.json`
**Action:** CREATE **Layer:** Util
```json
{
  "name": "@warisly/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.45.4",
    "@warisly/db": "workspace:*",
    "@warisly/lib": "workspace:*",
    "@warisly/ui": "workspace:*",
    "next": "^15.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "server-only": "^0.0.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.7.5",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3"
  }
}
```

#### 2. `apps/web/next.config.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Transpile the workspace packages (no separate build step).
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@warisly/ui", "@warisly/db", "@warisly/lib"],
  experimental: { typedRoutes: true },
};

export default nextConfig;
```

#### 3. `apps/web/tsconfig.json`
**Action:** CREATE **Layer:** Util
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 4. `apps/web/postcss.config.mjs`
**Action:** CREATE **Layer:** Util
```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

#### 5. `apps/web/tailwind.config.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Brand preset + scan the UI package so its classes are generated.
```typescript
import type { Config } from "tailwindcss";
import { warislyPreset } from "../../packages/ui/tailwind-preset";

const config: Config = {
  presets: [warislyPreset as Config],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
```

#### 6. `apps/web/app/globals.css`
**Action:** CREATE **Layer:** Util
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #f4eee0;
  color: #23242e;
  font-family: var(--font-spectral), Georgia, serif;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 { font-family: var(--font-fraunces), Georgia, serif; line-height: 1.1; }
```

#### 7. `apps/web/app/layout.tsx`
**Action:** CREATE **Layer:** Page
```typescript
import type { Metadata, Viewport } from "next";
import { Fraunces, Spectral, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fraunces", display: "swap" });
const spectral = Spectral({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-spectral", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Warisly — Waris aman, keluarga tenang",
  description: "Catat aset Anda dan langkah agar keluarga bisa menemukan dan mengklaimnya. Kami tidak pernah minta password Anda.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#20274B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${fraunces.variable} ${spectral.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

#### 8. `apps/web/app/page.tsx`
**Action:** CREATE **Layer:** Page **Purpose:** Landing; confirms packages + fonts render. Replaced in Batch 2.
```typescript
import { copy } from "@warisly/lib";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <p className="font-sans text-xs uppercase tracking-eyebrow text-emas">{copy.brand}</p>
      <h1 className="mt-3 font-display text-4xl text-tinta">{copy.tagline}</h1>
      <p className="mt-6 font-sans text-sm text-paper-muted">{copy.reassurePassword}</p>
    </main>
  );
}
```

#### 9. `apps/web/src/lib/env.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Client-safe public env. No secrets.
```typescript
import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
```

#### 10. `apps/web/src/lib/env.server.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Server-only secrets.
```typescript
import "server-only";
import { z } from "zod";

const serverSchema = z.object({ SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) });

export const serverEnv = serverSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
```

#### 11. `apps/web/src/lib/supabase/client.ts`
**Action:** CREATE **Layer:** Data
```typescript
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
```

#### 12. `apps/web/src/lib/supabase/server.ts`
**Action:** CREATE **Layer:** Data **Purpose:** Cookie-bound server client — RLS-scoped as the user. NOT service-role.
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component context — middleware refreshes the session.
        }
      },
    },
  });
}
```

#### 13. `apps/web/src/lib/supabase/admin.ts`
**Action:** CREATE **Layer:** Data **Purpose:** Service-role wrapper. `server-only`. Use ONLY for non-user paths (audit writes, webhooks, admin ops).
```typescript
import "server-only";
import { createAdminClient } from "@warisly/db";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

export function adminClient() {
  return createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY);
}
```

#### 14. `apps/web/public/manifest.webmanifest`
**Action:** CREATE **Layer:** Util
```json
{
  "name": "Warisly",
  "short_name": "Warisly",
  "description": "Waris aman, keluarga tenang.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F4EEE0",
  "theme_color": "#20274B",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

#### 15. `apps/web/.env.example`
**Action:** CREATE **Layer:** Util
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### ENVIRONMENT VARIABLES (new)
| Variable | Value | Where | Client-safe? |
|----------|-------|-------|--------------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project | Vercel (web project) + `apps/web/.env.local` | Yes |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase project | same | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase project | Vercel (web, server) + `apps/web/.env.local` | **No — server only** |

### VERIFICATION
- [ ] `pnpm --filter @warisly/web dev` → `localhost:3000` renders the Bahasa landing in Fraunces/Spectral, parchment background; text comes from `@warisly/lib`.
- [ ] `pnpm --filter @warisly/web typecheck` passes.
- [ ] Importing `@/lib/supabase/admin` into a `"use client"` component fails the build (server-only boundary holds).
