# IMPLEMENTATION BRIEF: Workspace Foundation + Shared Packages
## Surface: workspace (root + packages)
## Brief: #0a
## Phase: 1 (MVP)
## Depends on: None
## Blocks: #0b, #0c, #1, #2, #3
## Parallel with: None

### CONTEXT
Initialise the Warisly monorepo (pnpm workspaces + Turborepo) and the three shared packages — `@warisly/lib` (copy/utils), `@warisly/db` (Supabase types + service-role factory + data layer), `@warisly/ui` (brand tokens + design-system skeleton) — plus Supabase init at the repo root.

### NON-NEGOTIABLE CHECK
No credentials, money, or provider-auth. Packages are framework-agnostic source (consumed via `transpilePackages`). The service-role factory in `@warisly/db` takes the key as an argument and is wrapped `server-only` inside each app — the key never reaches a package that a client bundle could import. RLS-aware data functions take a `SupabaseClient` (they run as the caller's auth context). Copy is Bahasa-first and centralised.

### PRE-FLIGHT CHECKS
- [ ] Node 20+, pnpm 9+, git repo initialised, empty.
- [ ] Supabase project exists (SG region) — URL, anon key, service-role key on hand.

### STEPS (run in order)
```bash
# from repo root
pnpm init
# create the workspace + package files below, then:
pnpm install
pnpm dlx supabase init   # creates supabase/config.toml + supabase/migrations/
```

### FILES TO CREATE/MODIFY

#### 1. `package.json` (root)
**Action:** CREATE **Layer:** Util
```json
{
  "name": "warisly",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.1.3",
    "typescript": "^5.6.3"
  }
}
```

#### 2. `pnpm-workspace.yaml`
**Action:** CREATE **Layer:** Util
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

#### 3. `turbo.json`
**Action:** CREATE **Layer:** Util
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

#### 4. `tsconfig.base.json`
**Action:** CREATE **Layer:** Util
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve"
  }
}
```

#### 5. `.gitignore`
**Action:** CREATE **Layer:** Util
```
node_modules
.next
dist
.turbo
.env*.local
.env
.DS_Store
*.log
```

#### 6. `packages/lib/package.json`
**Action:** CREATE **Layer:** Util **Purpose:** Shared copy + utils. Source consumed directly (no build).
```json
{
  "name": "@warisly/lib",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": { "zod": "^3.23.8" }
}
```

#### 7. `packages/lib/tsconfig.json`
**Action:** CREATE **Layer:** Util
```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

#### 8. `packages/lib/src/copy.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Central Bahasa-first strings (English in comments).
```typescript
export const copy = {
  brand: "Warisly",
  reassurePassword: "Kami tidak pernah minta password Anda.", // We never ask for your password.
  tagline: "Waris aman, keluarga tenang.",
  nav: { home: "Beranda", assets: "Aset", amanah: "Amanah", profile: "Profil" },
  freshness: { fresh: "Terkini", stale: "Perlu ditinjau", lastReviewed: "Terakhir ditinjau" },
  estimate: "estimasi",
  sealed: "Tersegel", // Sealed until needed
  actions: { viewRecovery: "Lihat panduan pemulihan", addAsset: "Tambah aset", save: "Simpan", cancel: "Batal" },
} as const;
```

#### 9. `packages/lib/src/index.ts`
**Action:** CREATE **Layer:** Util
```typescript
export * from "./copy";
```

#### 10. `packages/db/package.json`
**Action:** CREATE **Layer:** Util **Purpose:** Supabase types + service-role factory + RLS-aware data layer.
```json
{
  "name": "@warisly/db",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": { "@supabase/supabase-js": "^2.45.4" }
}
```

#### 11. `packages/db/tsconfig.json`
**Action:** CREATE **Layer:** Util
```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

#### 12. `packages/db/src/types.ts`
**Action:** CREATE **Layer:** Data **Purpose:** Generated DB types placeholder. Regenerate after Brief #1.
```typescript
// Regenerate after migrations:
//   pnpm dlx supabase gen types typescript --project-id <PROJECT_ID> > packages/db/src/types.ts
export type Database = Record<string, never>;
```

#### 13. `packages/db/src/admin.ts`
**Action:** CREATE **Layer:** Data **Purpose:** Service-role client factory — bypasses RLS. Key is passed in (never hardcoded); each app wraps this `server-only`.
```typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createAdminClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

#### 14. `packages/db/src/index.ts`
**Action:** CREATE **Layer:** Data
```typescript
export * from "./admin";
export * from "./types";
```

#### 15. `packages/db/src/data/.gitkeep`
**Action:** CREATE **Layer:** Util **Purpose:** Home for RLS-aware query functions `(supabase, args) => typed result` (added per feature brief).
```
```

#### 16. `packages/ui/package.json`
**Action:** CREATE **Layer:** Util **Purpose:** Brand design system. Components added in Brief #3.
```json
{
  "name": "@warisly/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": { "@warisly/lib": "workspace:*", "lucide-react": "^0.451.0" },
  "peerDependencies": { "react": "^19.0.0", "react-dom": "^19.0.0" }
}
```

#### 17. `packages/ui/tsconfig.json`
**Action:** CREATE **Layer:** Util
```json
{ "extends": "../../tsconfig.base.json", "include": ["src", "tailwind-preset.ts"] }
```

#### 18. `packages/ui/tailwind-preset.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Shared brand tokens. Both apps load this as a Tailwind preset (single source of truth for the palette + fonts).
```typescript
import type { Config } from "tailwindcss";

export const warislyPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        tinta: "#20274B",
        emas: "#B5863C",
        kertas: "#F4EEE0",
        daun: "#42523F",
        nyala: { DEFAULT: "#3C54C6", pressed: "#2C3E9C" },
        ink: { DEFAULT: "#20274B", text: "#F4EEE0", muted: "#BCC0D6" },
        paper: { text: "#23242E", muted: "#5C5D69", edge: "#E4DAC3" },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        serif: ["var(--font-spectral)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: { eyebrow: "0.2em" },
    },
  },
};
```

#### 19. `packages/ui/src/index.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Barrel — populated by Brief #3.
```typescript
export {};
```

### ENVIRONMENT VARIABLES
None at root. Per-app `.env.local` defined in Briefs #0b / #0c.

### VERIFICATION
- [ ] `pnpm install` resolves with `@warisly/lib`, `@warisly/db`, `@warisly/ui` linked as workspace packages.
- [ ] `supabase/migrations/` exists after `supabase init`.
- [ ] `pnpm typecheck` passes (packages compile; no app yet).
- [ ] `packages/db` has no dependency on `next` or any app (framework-agnostic).
