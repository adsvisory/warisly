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

export const serverEnv = serverSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  EKYC_BASE_URL: process.env.EKYC_BASE_URL,
  EKYC_API_KEY: process.env.EKYC_API_KEY,
  EKYC_WEBHOOK_SECRET: process.env.EKYC_WEBHOOK_SECRET,
});
