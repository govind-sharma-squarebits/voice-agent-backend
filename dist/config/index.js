import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('5000').transform(Number),
    MONGODB_URI: z.string().default('mongodb://localhost:27017/teqvira-agent'),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    GEMINI_API_KEY: z.string().min(1, 'Gemini API Key is required'),
    ELEVENLABS_API_KEY: z.string().min(1, 'ElevenLabs API Key is required'),
    ELEVENLABS_VOICE_ID: z.string().default('JBFqnCBsd6RMkjVDRZzb'),
    // Rate limiting
    RATE_LIMIT_HTTP_MAX: z.string().default('100').transform(Number),
    RATE_LIMIT_SOCKET_MAX: z.string().default('30').transform(Number),
    // Memory & session
    SESSION_EVICTION_MS: z.string().default('1800000').transform(Number),
    // AI timeouts
    AI_REQUEST_TIMEOUT_MS: z.string().default('30000').transform(Number),
    TTS_MAX_RETRIES: z.string().default('3').transform(Number),
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('❌ Invalid environment variables:', _env.error.format());
    process.exit(1);
}
export const config = _env.data;
