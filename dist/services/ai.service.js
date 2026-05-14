import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();
export class AIService {
    genAI;
    model;
    chatSession;
    history = [];
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            systemInstruction: `You are 'Astra', a highly intelligent and empathetic AI voice assistant. 
      Your goals:
      1. Be extremely conversational and human-like.
      2. Keep responses short (1-3 sentences) because you are talking, not writing.
      3. Never use markdown or bolding. Speak in plain text.`,
        });
        this.chatSession = this.model.startChat({
            history: this.history,
        });
    }
    async getStreamingResponse(text) {
        try {
            const result = await this.chatSession.sendMessageStream(text);
            return result.stream;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Gemini API Error:', errorMessage);
            throw error;
        }
    }
    addToHistory(role, content) {
        this.history.push({
            role: role === 'assistant' ? 'model' : 'user',
            parts: [{ text: content }],
        });
    }
}
