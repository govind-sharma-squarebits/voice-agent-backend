import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  GEMINI_API_KEY: z.string().min(1, "Gemini API Key is required"),
  ELEVENLABS_API_KEY: z.string().min(1, "ElevenLabs API Key is required"),
  ELEVENLABS_VOICE_ID: z.string().default('JBFqnCBsd6RMkjVDRZzb'),
  DEEPGRAM_API_KEY: z.string().optional(),
  JWT_SECRET: z.string().min(8, "JWT Secret must be at least 8 characters"),
  JWT_REFRESH_SECRET: z.string().min(8, "JWT Refresh Secret must be at least 8 characters"),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const config = _env.data;
