import { ElevenLabsClient } from 'elevenlabs';
import dotenv from 'dotenv';
import { Readable } from 'stream';
dotenv.config();
export class VoiceService {
    socket;
    elevenlabs;
    constructor(socket) {
        this.socket = socket;
        this.elevenlabs = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });
    }
    async streamTTS(text) {
        try {
            console.log('🔊 Generating audio for:', text);
            const audio = await this.elevenlabs.generate({
                voice: process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL",
                text: text,
                model_id: "eleven_multilingual_v2",
                output_format: "mp3_44100_128",
            });
            let fullBuffer;
            if (audio instanceof Buffer) {
                fullBuffer = audio;
            }
            else if (audio instanceof Readable || (typeof audio === 'object' && audio !== null && Symbol.asyncIterator in audio)) {
                const chunks = [];
                for await (const chunk of audio) {
                    chunks.push(chunk);
                }
                fullBuffer = Buffer.concat(chunks);
            }
            else {
                // Handle other possible return types (like Fetch Response body)
                const arrayBuffer = await audio.arrayBuffer();
                fullBuffer = Buffer.from(arrayBuffer);
            }
            if (fullBuffer.length > 0) {
                console.log(`📤 Sending audio response: ${fullBuffer.length} bytes`);
                this.socket.emit('audio-response', fullBuffer);
            }
            else {
                console.warn('⚠️ Generated audio buffer is empty');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ ElevenLabs Error:', errorMessage);
        }
    }
    resetInterrupt() { }
}
