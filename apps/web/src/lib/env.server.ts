import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  EKYC_BASE_URL: z.string().url(),
  EKYC_API_KEY: z.string().min(1),
  EKYC_WEBHOOK_SECRET: z.string().min(1),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

function loadServerEnv(): ServerEnv {
  if (cached) return cached;
  cached = serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    EKYC_BASE_URL: process.env.EKYC_BASE_URL,
    EKYC_API_KEY: process.env.EKYC_API_KEY,
    EKYC_WEBHOOK_SECRET: process.env.EKYC_WEBHOOK_SECRET,
  });
  return cached;
}

// Validated lazily on first property access (request time) — never at module
// import. `next build` collects page data by importing route modules, so an
// eager parse here would crash the build whenever these secrets are absent from
// the build environment (which they should be: a webhook secret is never needed
// to *build* the app, only to serve a request). The Proxy keeps `serverEnv.X`
// ergonomics while deferring validation until the value is actually read.
export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    return loadServerEnv()[prop as keyof ServerEnv];
  },
});
