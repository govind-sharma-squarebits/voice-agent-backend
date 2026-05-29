import {
  GoogleGenerativeAI,
  GenerativeModel,
  ChatSession,
  Content,
} from '@google/generative-ai';
import { config } from '../config/index.js';
import { MessageDto, MessageRole, AppError } from '../types/index.js';
import { buildSystemPrompt } from '../ai/prompt.builder.js';
import { getKnowledgeContext } from '../ai/knowledge.loader.js';
import { aiLogger } from '../utils/logger.js';

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model!: GenerativeModel;
  private chatSession!: ChatSession;
  private activeModelIndex = 0;
  private systemPrompt: string;

  constructor() {
    if (!config.GEMINI_API_KEY) {
      throw new AppError('CONFIG_ERROR', 'Missing Gemini API Key');
    }
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.systemPrompt = buildSystemPrompt(getKnowledgeContext());
    this.initializeModel(MODELS[0]);
  }

  private initializeModel(modelName: string): void {
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: this.systemPrompt,
    });
    this.chatSession = this.model.startChat({ history: [] });
    aiLogger.info({ model: modelName }, 'AI model initialized');
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    attempts = 3,
    delayMs = 500,
  ): Promise<T> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        aiLogger.warn({ attempt, attempts, error: err }, 'AI request failed, retrying');

        if (attempt === attempts) throw error;
        await new Promise(r => setTimeout(r, delayMs * attempt)); // exponential
      }
    }
    throw new AppError('AI_EXHAUSTED', 'AI service unreachable after retries');
  }

  async getStreamingResponse(text: string): Promise<AsyncIterable<string>> {
    const startTime = Date.now();
    aiLogger.debug({ model: MODELS[this.activeModelIndex], contentLength: text.length }, 'Streaming request start');

    try {
      const result = await this.withRetry(async () => {
        const signal = AbortSignal.timeout(config.AI_REQUEST_TIMEOUT_MS);
        const resultPromise = this.chatSession.sendMessageStream(text);
        // Race the promise against the timeout signal
        return Promise.race([
          resultPromise,
          new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () =>
              reject(new AppError('AI_TIMEOUT', 'Gemini request timed out')),
            );
          }),
        ]);
      }, 3, 500);

      const stream = (result as Awaited<ReturnType<ChatSession['sendMessageStream']>>).stream;

      // Wrap stream to emit string deltas
      async function* deltaStream(): AsyncIterable<string> {
        let fullResponse = '';
        for await (const chunk of stream) {
          const text = chunk.text();
          if (!text) continue;
          // Calculate delta (Gemini can return cumulative text)
          let delta = text;
          if (fullResponse && text.startsWith(fullResponse)) {
            delta = text.slice(fullResponse.length);
          }
          if (!delta) continue;
          fullResponse += delta;
          yield delta;
        }
        const latencyMs = Date.now() - startTime;
        aiLogger.info({ model: MODELS[0], latencyMs, responseLength: fullResponse.length }, 'Streaming complete');
      }

      return deltaStream();
    } catch (error) {
      // Try fallback model
      if (this.activeModelIndex < MODELS.length - 1) {
        this.activeModelIndex++;
        const next = MODELS[this.activeModelIndex];
        aiLogger.warn({ from: MODELS[this.activeModelIndex - 1], to: next }, 'Falling back to next model');
        this.initializeModel(next);
        return this.getStreamingResponse(text);
      }

      aiLogger.error({ error: String(error) }, 'All AI models exhausted');
      throw new AppError('AI_UNAVAILABLE', 'AI service is temporarily unavailable');
    }
  }

  addToHistory(role: MessageRole, content: string): void {
    if (!content) return;
    // Sync history into a new chat session preserving context
    const mappedRole: Content['role'] = role === MessageRole.USER ? 'user' : 'model';
    const history = this.chatSession['_history'] as Content[] | undefined;
    if (history) {
      history.push({ role: mappedRole, parts: [{ text: content }] });
      if (history.length > 40) history.splice(0, 2); // trim pairs
    }
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  syncHistory(messages: MessageDto[]): void {
    // 1. Exclude the current active user message (the last message, if it is USER)
    let historyMessages = messages;
    if (messages.length > 0 && messages[messages.length - 1].role === MessageRole.USER) {
      historyMessages = messages.slice(0, -1);
    }

    // 2. Gemini history MUST start with a 'user' message. Slice off any initial 'assistant' messages.
    const firstUserIdx = historyMessages.findIndex(m => m.role === MessageRole.USER);
    const filteredMessages = firstUserIdx !== -1 ? historyMessages.slice(firstUserIdx) : [];

    // 3. Map to Generative AI SDK Content format
    const history: Content[] = filteredMessages.map(m => ({
      role: m.role === MessageRole.USER ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    this.chatSession = this.model.startChat({ history });
  }
}
