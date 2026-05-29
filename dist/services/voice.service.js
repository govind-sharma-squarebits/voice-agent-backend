import { ElevenLabsClient } from 'elevenlabs';
import { Readable } from 'stream';
import { config } from '../config/index.js';
import { voiceLogger } from '../utils/logger.js';
export class VoiceService {
    client;
    activeTTSControllers = new Map();
    constructor() {
        this.client = new ElevenLabsClient({ apiKey: config.ELEVENLABS_API_KEY });
    }
    /**
     * Registers an AbortController for a session so barge-in can cancel it.
     */
    registerAbortController(sessionId) {
        const controller = new AbortController();
        this.activeTTSControllers.set(sessionId, controller);
        return controller;
    }
    /**
     * Cancels the active TTS stream for a session (barge-in support).
     */
    cancelTTS(sessionId) {
        const controller = this.activeTTSControllers.get(sessionId);
        if (controller) {
            controller.abort();
            this.activeTTSControllers.delete(sessionId);
            voiceLogger.debug({ sessionId }, 'TTS cancelled via barge-in');
        }
    }
    /**
     * Streams TTS audio for a sentence with retry logic.
     * Checks AbortController before each attempt.
     */
    async streamTTSWithRetry(text, socket, sessionId, attempt = 1) {
        const controller = this.activeTTSControllers.get(sessionId);
        if (controller?.signal.aborted)
            return;
        const startTime = Date.now();
        voiceLogger.debug({ sessionId, sentenceLength: text.length, attempt }, 'TTS request start');
        try {
            const audio = await this.client.generate({
                voice: config.ELEVENLABS_VOICE_ID,
                text,
                model_id: 'eleven_multilingual_v2',
                output_format: 'mp3_44100_128',
            });
            let fullBuffer;
            if (audio instanceof Buffer) {
                fullBuffer = audio;
            }
            else if (audio instanceof Readable ||
                (typeof audio === 'object' && audio !== null && Symbol.asyncIterator in audio)) {
                const chunks = [];
                for await (const chunk of audio) {
                    if (controller?.signal.aborted)
                        return; // barge-in mid-stream
                    chunks.push(chunk);
                }
                fullBuffer = Buffer.concat(chunks);
            }
            else {
                const arrayBuffer = await audio.arrayBuffer();
                fullBuffer = Buffer.from(arrayBuffer);
            }
            if (controller?.signal.aborted)
                return;
            if (fullBuffer.length > 0) {
                socket.emit('audio:chunk', fullBuffer);
                const latencyMs = Date.now() - startTime;
                voiceLogger.info({ sessionId, bytes: fullBuffer.length, latencyMs }, 'TTS audio sent');
            }
            else {
                voiceLogger.warn({ sessionId }, 'ElevenLabs returned empty audio buffer');
            }
        }
        catch (error) {
            const err = error instanceof Error ? error.message : String(error);
            voiceLogger.warn({ sessionId, attempt, error: err }, 'ElevenLabs TTS failed');
            if (attempt < config.TTS_MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 300 * attempt));
                return this.streamTTSWithRetry(text, socket, sessionId, attempt + 1);
            }
            // Graceful degrade — text already streamed to UI, just skip audio
            voiceLogger.error({ sessionId, text }, 'ElevenLabs TTS exhausted — audio skipped');
            socket.emit('error', {
                code: 'TTS_FAILED',
                message: 'Voice response unavailable. Text response shown.',
            });
        }
    }
    cleanup(sessionId) {
        this.activeTTSControllers.delete(sessionId);
    }
}
