# IMPLEMENTATION BRIEF: Admin App Scaffold (apps/admin)
## Surface: admin (back-office)
## Brief: #0c
## Phase: 1 (MVP)
## Depends on: #0a
## Blocks: #9c
## Parallel with: #0b

### CONTEXT
A minimal, separately-deployed Next.js console for Warisly staff. Scaffold only — internal auth (magic link/SSO + MFA), RBAC, and dual-control land in Brief #9c. Isolated from `apps/web` so the public surface and the privileged console never share a deployment.

### NON-NEGOTIABLE CHECK
No credentials/money/provider-auth. Admin acts on user data exclusively via the service-role client behind `server-only`, and every admin action will be audited to `wrs_events` (wired in #9c). This scaffold ships **no** data access yet — it is a locked shell until auth + RBAC exist. Separate Vercel project = reduced blast radius vs the public app.

### PRE-FLIGHT CHECKS
- [ ] Brief #0a done.
- [ ] Admin will deploy as its OWN Vercel project on an internal domain — do not attach it to the web project.

### FILES TO CREATE/MODIFY

#### 1. `apps/admin/package.json`
**Action:** CREATE **Layer:** Util
```json
{
  "name": "@warisly/admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
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

#### 2. `apps/admin/next.config.ts`
**Action:** CREATE **Layer:** Util
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@warisly/ui", "@warisly/db", "@warisly/lib"],
};

export default nextConfig;
```

#### 3. `apps/admin/tsconfig.json`
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

#### 4. `apps/admin/postcss.config.mjs`
**Action:** CREATE **Layer:** Util
```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

#### 5. `apps/admin/tailwind.config.ts`
**Action:** CREATE **Layer:** Util
```typescript
import type { Config } from "tailwindcss";
import { warislyPreset } from "../../packages/ui/tailwind-preset";

const config: Config = {
  presets: [warislyPreset as Config],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};

export default config;
```

#### 6. `apps/admin/app/globals.css`
**Action:** CREATE **Layer:** Util **Purpose:** Admin is dense/functional/internal — default to the ink surface.
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #20274b;
  color: #f4eee0;
  font-family: var(--font-inter), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

#### 7. `apps/admin/app/layout.tsx`
**Action:** CREATE **Layer:** Page
```typescript
import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = { title: "Warisly — Back-office", robots: { index: false, follow: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

#### 8. `apps/admin/app/page.tsx`
**Action:** CREATE **Layer:** Page **Purpose:** Locked placeholder until auth/RBAC (Brief #9c).
```typescript
export default function AdminHome() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="text-xs uppercase tracking-eyebrow text-emas">Warisly · Internal</p>
      <h1 className="mt-3 font-display text-3xl text-ink-text">Back-office</h1>
      <p className="mt-4 text-sm text-ink-muted">
        Konsol terkunci. Otentikasi staf, RBAC, dan dual-control dipasang di Brief #9c.
      </p>
    </main>
  );
}
```

#### 9. `apps/admin/.env.example`
**Action:** CREATE **Layer:** Util
```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### ENVIRONMENT VARIABLES (new)
| Variable | Value | Where | Client-safe? |
|----------|-------|-------|--------------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project | Vercel (admin project) + `apps/admin/.env.local` | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase project | Vercel (admin, server) + `apps/admin/.env.local` | **No — server only** |

### VERIFICATION
- [ ] `pnpm --filter @warisly/admin dev` → `localhost:3001` renders the locked back-office shell on the ink surface.
- [ ] No data-access code present (no Supabase query runs) — confirmed shell-only until #9c.
- [ ] Deploys as a separate Vercel project on an internal domain, not linked to web.
