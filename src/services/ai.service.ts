import { GoogleGenerativeAI, ChatSession, Content, GenerativeModel } from '@google/generative-ai';
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
  private genAI: GoogleGenerativeAI;
  private model!: GenerativeModel;
  private chatSession!: ChatSession;
  private history: Content[] = [];
  private activeModelIndex: number = 0;

  constructor() {
    if (!config.GEMINI_API_KEY) {
      throw new Error("Missing Gemini API Key");
    }

    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.initializeModel(MODELS[0]);
  }

  private initializeModel(modelName: string) {
    try {
      this.model = this.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: `You are a professional, helpful AI voice assistant. Keep responses very short, natural, and concise (1-2 sentences maximum). Do not mention your name or that you are an AI. Sound like a real person helping over the phone.`,
      });

      this.chatSession = this.model.startChat({
        history: this.history,
      });
      
      console.log(`📡 [PROD] Model Active: ${modelName}`);
    } catch (error) {
      console.error(`❌ Failed to init ${modelName}:`, error);
    }
  }

  public async getStreamingResponse(text: string): Promise<any> {
    try {
      const result = await this.chatSession.sendMessageStream(text);
      return result.stream;
    } catch (error: any) {
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

  public addToHistory(role: 'assistant' | 'user', content: string) {
    if (!content) return;
    this.history.push({
      role: role === 'assistant' ? 'model' : 'user',
      parts: [{ text: content }],
    });
    if (this.history.length > 20) this.history = this.history.slice(-20);
  }
}
