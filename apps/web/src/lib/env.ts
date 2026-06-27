import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

type PublicEnv = z.infer<typeof publicSchema>;

let cached: PublicEnv | null = null;

function loadEnv(): PublicEnv {
  if (cached) return cached;
  cached = publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return cached;
}

// Validated lazily on first access (request time) — never at module import — so
// `next build` page-data collection doesn't crash when these are absent from the
// build environment. The Proxy preserves `env.X` ergonomics. Next still inlines
// the `NEXT_PUBLIC_*` literals into the client bundle as usual.
export const env = new Proxy({} as PublicEnv, {
  get(_target, prop: string) {
    return loadEnv()[prop as keyof PublicEnv];
  },
});
