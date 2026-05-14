import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
/**
 * Fallback chain uses current model IDs for the Generative Language API.
 * Legacy ids (gemini-1.5-* without version, gemini-1.0-pro) often 404 on v1beta.
 */
const MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-pro',
];
export class AIService {
    genAI;
    model;
    chatSession;
    history = [];
    activeModelIndex = 0;
    constructor() {
        if (!config.GEMINI_API_KEY) {
            throw new Error("Missing Gemini API Key");
        }
        this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
        this.initializeModel(MODELS[0]);
    }
    initializeModel(modelName) {
        try {
            this.model = this.genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: `You are Astra, a helpful voice assistant. Keep responses very short (1-2 sentences).`,
            });
            this.chatSession = this.model.startChat({
                history: this.history,
            });
            console.log(`📡 [PROD] Model Active: ${modelName}`);
        }
        catch (error) {
            console.error(`❌ Failed to init ${modelName}:`, error);
        }
    }
    async getStreamingResponse(text) {
        try {
            const result = await this.chatSession.sendMessageStream(text);
            return result.stream;
        }
        catch (error) {
            // Automatic Fallback through the chain
            if (this.activeModelIndex < MODELS.length - 1) {
                this.activeModelIndex++;
                const nextModel = MODELS[this.activeModelIndex];
                console.warn(`⚠️ Model ${MODELS[this.activeModelIndex - 1]} failed. Trying fallback: ${nextModel}...`);
                this.initializeModel(nextModel);
                return this.getStreamingResponse(text);
            }
            console.error('❌ AI Engine Exhausted:', error.message);
            throw new Error('AI Service Unavailable');
        }
    }
    addToHistory(role, content) {
        if (!content)
            return;
        this.history.push({
            role: role === 'assistant' ? 'model' : 'user',
            parts: [{ text: content }],
        });
        if (this.history.length > 20)
            this.history = this.history.slice(-20);
    }
}
